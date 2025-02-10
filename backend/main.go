package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"

	// "github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Preference struct {
	Id           int       `json:"id"`
	UserId       int       `json:"user_id"`
	DepthMin     float64   `json:"depth_min"`
	DepthMax     float64   `json:"depth_max"`
	TimeStart    time.Time `json:"time_start"`
	TimeEnd      time.Time `json:"time_end"`
	MagnitudeMin float64   `json:"magnitude_min"`
	MagnitudeMax float64   `json:"magnitude_max"`
	LongitudeMin float64   `json:"longitude_min"`
	LongitudeMax float64   `json:"longitude_max"`
	LatitudeMin  float64   `json:"latitude_min"`
	LatitudeMax  float64   `json:"latitude_max"`
}

type Earthquake struct {
    Id        int    `json:"id"`
    Time      time.Time `json:"time"`
    Latitude  float64   `json:"latitude"`
    Longitude float64   `json:"longitude"`
    Depth     float64   `json:"depth"`
    Magnitude float64   `json:"magnitude"`
    Place     string    `json:"place"`
    Alert     string    `json:"alert"`
    Tsunami   int       `json:"tsunami"`
    URL       string    `json:"url"`
}

func main() {
	// Connect to the database
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Ensure tables are created
	initializeDatabase(db)

	user := User{
		Id:       1,
		Name:     "Thad",
		Email:    "thad@gmail.com",
		Password: "password",
	}

	createUserPrivate(db, user)

	// Create the main router
	router := mux.NewRouter()

	// Public routes
	router.HandleFunc("/login", handleLogin(db)).Methods("POST")
	router.HandleFunc("/sign-up", handleSignUp(db)).Methods("POST")
	router.HandleFunc("/verify-token", handleVerifyToken()).Methods("POST")

	// Private routes (require authentication)
	privateRouter := router.PathPrefix("/api/go").Subrouter()
	privateRouter.Use(authMiddleware)

	// User routes
	privateRouter.HandleFunc("/users", getUsers(db)).Methods("GET")
	privateRouter.HandleFunc("/users", createUser(db)).Methods("POST")
	privateRouter.HandleFunc("/users/{id}", getUser(db)).Methods("GET")
	privateRouter.HandleFunc("/users/{id}", updateUser(db)).Methods("PUT")
	privateRouter.HandleFunc("/users/{id}", deleteUser(db)).Methods("DELETE")

	// Preference routes
	privateRouter.HandleFunc("/preferences", getPreferences(db)).Methods("GET")
	privateRouter.HandleFunc("/preferences", createPreference(db)).Methods("POST")
	privateRouter.HandleFunc("/preferences/{id}", getPreference(db)).Methods("GET")
	privateRouter.HandleFunc("/preferences/{id}", updatePreference(db)).Methods("PUT")
	privateRouter.HandleFunc("/preferences/{id}", deletePreference(db)).Methods("DELETE")
	privateRouter.HandleFunc("/earthquakes", getEarthquakes(db)).Methods("GET")

	// Wrap the main router with middlewares
	corsRouter := enableCORS(jsonContentTypeMiddleware(router))

	// Start the server
	log.Println("Server running on port 8000...")
	log.Fatal(http.ListenAndServe(":8000", corsRouter))
}

func initializeDatabase(db *sql.DB) error {
	// Create the users table if it doesn't exist
	_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		name TEXT,
		email TEXT,
		password TEXT
	)`)
	if err != nil {
		log.Fatalf("Error creating users table: %v", err)
	}

	// Create the preferences table if it doesn't exist
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS preferences (
		id SERIAL PRIMARY KEY,
		user_id INT REFERENCES users(id) ON DELETE CASCADE,
		depth_min FLOAT DEFAULT -100,
		depth_max FLOAT DEFAULT 1000,
		time_start TIMESTAMP DEFAULT now() - interval '30 days',
		time_end TIMESTAMP DEFAULT now(),
		magnitude_min FLOAT DEFAULT 0,
		magnitude_max FLOAT DEFAULT 10,
		longitude_min FLOAT DEFAULT -180,
		longitude_max FLOAT DEFAULT 180,
		latitude_min FLOAT DEFAULT -90,
		latitude_max FLOAT DEFAULT 90
	)`)
	if err != nil {
		log.Fatalf("Error creating preferences table: %v", err)
	}
    _, err = db.Exec(`
    DROP TABLE IF EXISTS earthquakes`)
    if err != nil {
        log.Fatalf("Error dropping earthquakes table: %v", err)
    }

    // Create the earthquakes table if it doesn't exist
    _, err = db.Exec(`
    CREATE TABLE IF NOT EXISTS earthquakes (
        id SERIAL PRIMARY KEY,
        time TIMESTAMP,
        latitude FLOAT,
        longitude FLOAT,
        depth FLOAT,
        magnitude FLOAT,
        place TEXT,
        alert TEXT,
        tsunami INT,
        url TEXT
    )`)
    if err != nil {
        log.Fatalf("Error creating earthquakes table: %v", err)
    }

    return loadEarthquakeData(db, "data/earthquakes.csv")

}



func loadEarthquakeData(db *sql.DB, filePath string) error {
    file, err := os.Open(filePath)
    if err != nil {
        return err
    }
    defer file.Close()

    reader := csv.NewReader(file)
    records, err := reader.ReadAll()
    if err != nil {
        return err
    }

    // Skip the header row
    for i, record := range records[1:] {
        timeUnix, err := strconv.ParseFloat(record[1], 64)
        if err != nil {
            log.Printf("Error parsing time for record %d: %v", i, err)
            continue
        }
        time := time.Unix(int64(timeUnix/1000), 0)
        latitude, err := strconv.ParseFloat(record[2], 64)
        if err != nil {
            log.Printf("Error parsing latitude for record %d: %v", i, err)
            continue
        }
        longitude, err := strconv.ParseFloat(record[3], 64)
        if err != nil {
            log.Printf("Error parsing longitude for record %d: %v", i, err)
            continue
        }
        depth, err := strconv.ParseFloat(record[4], 64)
        if err != nil {
            log.Printf("Error parsing depth for record %d: %v", i, err)
            continue
        }
        magnitude, err := strconv.ParseFloat(record[5], 64)
        if err != nil {
            log.Printf("Error parsing magnitude for record %d: %v", i, err)
            continue
        }
        place := record[6]
        alert := record[7]
        tsunami, err := strconv.Atoi(record[8])
        if err != nil {
            log.Printf("Error parsing tsunami for record %d: %v", i, err)
            continue
        }
        url := record[9]

        _, err = db.Exec(`
        INSERT INTO earthquakes (time, latitude, longitude, depth, magnitude, place, alert, tsunami, url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING`,
            time, latitude, longitude, depth, magnitude, place, alert, tsunami, url)
        if err != nil {
            log.Printf("Error inserting record %d: %v", i, err)
        }
    }

    log.Println("Earthquake data loaded successfully")
    return nil
}


func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := r.Header.Get("Authorization")
		if tokenString == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		tokenString = strings.Replace(tokenString, "Bearer ", "", 1)

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte("secret"), nil
		})

		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if !token.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		userID, ok := claims["user_id"].(string)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Allow any origin
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization") // Add Authorization here

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Pass down the request to the next middleware (or final handler)
		next.ServeHTTP(w, r)
	})
}

func jsonContentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set JSON Content-Type
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}
func getUserByEmail(db *sql.DB, email string) (User, error) {
	var user User
	row := db.QueryRow("SELECT id, name, email, password FROM users WHERE email = $1", email)
	err := row.Scan(&user.Id, &user.Name, &user.Email, &user.Password)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func createToken(userID int, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": strconv.Itoa(userID),
		"email":   email,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	fmt.Println("Token: ", token)
	return token.SignedString([]byte("secret"))
}

func getUserIDFromContext(ctx context.Context) (string, error) {
	userID, ok := ctx.Value("user_id").(string)
	if !ok {
		return "", fmt.Errorf("user ID not found in context")
	}
	return userID, nil
}
func handleVerifyToken() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			fmt.Println("Authorization header is missing")
			http.Error(w, "Authorization header is required", http.StatusBadRequest)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			fmt.Println("Token is required")
			http.Error(w, "Token is required", http.StatusBadRequest)
			return
		}

		// Debug: Log the token received
		fmt.Println("Verifying token: ", tokenString)

		// Parse and validate the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte("secret"), nil
		})

		if err != nil || !token.Valid {
			fmt.Println("Invalid token: ", err)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			fmt.Println("Invalid token claims")
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		// Debug: Log valid token claims
		fmt.Println("Valid token - claims: ", claims)

		// Respond with claims
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":  true,
			"claims": claims,
		})
	}
}

func handleSignUp(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var loginReq User
		if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
			fmt.Println("Error decoding login request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		fmt.Println("Sign Up attempt for user: ", loginReq.Email)
		fmt.Println("Creating user: ", loginReq.Email)
		createUserPrivate(db, loginReq)

		// Fetch user from DB
		user, err := getUserByEmail(db, loginReq.Email)

		if err != nil {
			if err == sql.ErrNoRows {
				fmt.Println("User not found after creation: ", loginReq.Email)
				http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			} else {
				fmt.Println("Database error: ", err)
				http.Error(w, "Server error", http.StatusInternalServerError)
			}
			return
		}

		// Generate token
		token, err := createToken(user.Id, user.Email)
		if err != nil {
			fmt.Println("Error generating token: ", err)
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}

		fmt.Println("Generated token for NEW user: ", user.Email)

		// Respond with token
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})
	}
}

func handleLogin(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var loginReq User
		if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
			fmt.Println("Error decoding login request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		fmt.Println("Login attempt for user: ", loginReq.Email)

		// Fetch user from DB
		user, err := getUserByEmail(db, loginReq.Email)
		if err != nil {
			if err == sql.ErrNoRows {
				fmt.Println("User not found: ", loginReq.Email)
				http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			} else {
				fmt.Println("Database error: ", err)
				http.Error(w, "Server error", http.StatusInternalServerError)
			}
			return
		}

		// Compare hashed passwords
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password)); err != nil {
			fmt.Println("Invalid password for user: ", loginReq.Email)
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}

		// Generate token
		token, err := createToken(user.Id, user.Email)
		if err != nil {
			fmt.Println("Error generating token: ", err)
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}

		fmt.Println("Generated token for user: ", user.Email)

		// Respond with token
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})
	}
}

// get all users
func getUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query("SELECT id, name, email, password FROM users")
		if err != nil {
			log.Fatal(err)
		}
		defer rows.Close()

		users := []User{} // array of users
		for rows.Next() {
			var u User
			var password string // temporary variable to hold the password
			if err := rows.Scan(&u.Id, &u.Name, &u.Email, &password); err != nil {
				log.Fatal(err)
			}
			users = append(users, u)
		}
		if err := rows.Err(); err != nil {
			log.Fatal(err)
		}

		json.NewEncoder(w).Encode(users)
	}
}
func getEarthquakes(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        userID, err := getUserIDFromContext(r.Context())
        if err != nil {
            log.Println("Unauthorized request")
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        log.Println("Fetching earthquakes for user ID:", userID)

        // Parse query parameters
        query := r.URL.Query()
        var conditions []string
        var args []interface{}
        argID := 1

        if val, ok := query["time_start"]; ok {
            conditions = append(conditions, "time >= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["time_end"]; ok {
            conditions = append(conditions, "time <= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["depth_min"]; ok {
            conditions = append(conditions, "depth >= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["depth_max"]; ok {
            conditions = append(conditions, "depth <= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["magnitude_min"]; ok {
            conditions = append(conditions, "magnitude >= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["magnitude_max"]; ok {
            conditions = append(conditions, "magnitude <= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["longitude_min"]; ok {
            conditions = append(conditions, "longitude >= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["longitude_max"]; ok {
            conditions = append(conditions, "longitude <= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["latitude_min"]; ok {
            conditions = append(conditions, "latitude >= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }
        if val, ok := query["latitude_max"]; ok {
            conditions = append(conditions, "latitude <= $"+strconv.Itoa(argID))
            args = append(args, val[0])
            argID++
        }

        queryString := "SELECT id, time, latitude, longitude, depth, magnitude, place, alert, tsunami, url FROM earthquakes"
        if len(conditions) > 0 {
            queryString += " WHERE " + strings.Join(conditions, " AND ")
        }

        log.Println("Executing query:", queryString, "with args:", args)

        rows, err := db.Query(queryString, args...)
        if err != nil {
            log.Println("Error executing query:", err)
            http.Error(w, "Database query error", http.StatusInternalServerError)
            return
        }
        defer rows.Close()

        earthquakes := []Earthquake{}
        for rows.Next() {
            var e Earthquake
            if err := rows.Scan(&e.Id, &e.Time, &e.Latitude, &e.Longitude, &e.Depth, &e.Magnitude, &e.Place, &e.Alert, &e.Tsunami, &e.URL); err != nil {
                log.Println("Error scanning row:", err)
                continue
            }
            earthquakes = append(earthquakes, e)
        }

        log.Println("Retrieved", len(earthquakes), "earthquakes")

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(earthquakes)
    }
}

// get user by id
func getUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		var u User
		err := db.QueryRow("SELECT * FROM users WHERE id = $1", id).Scan(&u.Id, &u.Name, &u.Email)
		if err != nil {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		json.NewEncoder(w).Encode(u)
	}
}
func createUserPrivate(db *sql.DB, user User) error {
	// Hash the user's password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Insert the user into the database
	err = db.QueryRow(
		"INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
		user.Name, user.Email, hashedPassword,
	).Scan(&user.Id)
	if err != nil {
		log.Println("Database error:", err)
		return err
	}

	return nil
}

// create user
func createUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var user User
		// Decode the JSON request body into the user struct
		err := json.NewDecoder(r.Body).Decode(&user)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Ensure the required fields are present
		if user.Name == "" || user.Email == "" || user.Password == "" {
			http.Error(w, "Missing required fields: name, email, or password", http.StatusBadRequest)
			return
		}

		// Hash the user's password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}

		// Insert the user into the database
		err = db.QueryRow(
			"INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
			user.Name, user.Email, hashedPassword,
		).Scan(&user.Id)
		if err != nil {
			http.Error(w, "Failed to create user", http.StatusInternalServerError)
			log.Println("Database error:", err)
			return
		}

		// Respond with the created user (excluding the password)
		user.Password = "" // Do not include the password in the response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(user)
	}
}

// update user
func updateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var u User
		json.NewDecoder(r.Body).Decode(&u)

		vars := mux.Vars(r)
		id := vars["id"]

		// Execute the update query
		_, err := db.Exec("UPDATE users SET name = $1, email = $2 WHERE id = $3", u.Name, u.Email, id)
		if err != nil {
			log.Fatal(err)
		}

		// Retrieve the updated user data from the database
		var updatedUser User
		err = db.QueryRow("SELECT id, name, email FROM users WHERE id = $1", id).Scan(&updatedUser.Id, &updatedUser.Name, &updatedUser.Email)
		if err != nil {
			log.Fatal(err)
		}

		// Send the updated user data in the response
		json.NewEncoder(w).Encode(updatedUser)
	}
}

// delete user
func deleteUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		var u User
		err := db.QueryRow("SELECT * FROM users WHERE id = $1", id).Scan(&u.Id, &u.Name, &u.Email)
		if err != nil {
			w.WriteHeader(http.StatusNotFound)
			return
		} else {
			_, err := db.Exec("DELETE FROM users WHERE id = $1", id)
			if err != nil {
				//todo : fix error handling
				w.WriteHeader(http.StatusNotFound)
				return
			}

			json.NewEncoder(w).Encode("User deleted")
		}
	}
}

func createPreference(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Read the raw body for debugging
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			fmt.Println("Error reading request body:", err)
			return
		}
		fmt.Println("Raw request body:", string(body))

		// Decode JSON into struct
		var p Preference
		if err := json.Unmarshal(body, &p); err != nil {
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			fmt.Println("Error decoding JSON:", err)
			return
		}

		fmt.Println("Decoded Preference struct:", p)

		err = db.QueryRow(`
        INSERT INTO preferences (user_id, depth_min, depth_max, time_start, time_end, magnitude_min, magnitude_max, longitude_min, longitude_max, latitude_min, latitude_max)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
			userID, p.DepthMin, p.DepthMax, p.TimeStart, p.TimeEnd, p.MagnitudeMin, p.MagnitudeMax, p.LongitudeMin, p.LongitudeMax, p.LatitudeMin, p.LatitudeMax,
		).Scan(&p.Id)
		if err != nil {
			log.Fatal(err)
		}

		json.NewEncoder(w).Encode(p)
	}
}

func getPreferences(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		rows, err := db.Query("SELECT * FROM preferences WHERE user_id = $1", userID)
		if err != nil {
			log.Fatal(err)
		}
		defer rows.Close()

		prefs := []Preference{}
		for rows.Next() {
			var p Preference
			if err := rows.Scan(&p.Id, &p.UserId, &p.DepthMin, &p.DepthMax, &p.TimeStart, &p.TimeEnd, &p.MagnitudeMin, &p.MagnitudeMax, &p.LongitudeMin, &p.LongitudeMax, &p.LatitudeMin, &p.LatitudeMax); err != nil {
				log.Fatal(err)
			}
			prefs = append(prefs, p)
		}

		// print the length of preferences
		fmt.Println("Preferences Length: ", len(prefs))

		json.NewEncoder(w).Encode(prefs)
	}
}

func getPreference(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)
		id := vars["id"]

		var p Preference
		err = db.QueryRow(`
            SELECT id, user_id, depth_min, depth_max, time_start, time_end, magnitude_min, magnitude_max, longitude_min, longitude_max, latitude_min, latitude_max 
            FROM preferences 
            WHERE id = $1 AND user_id = $2`, id, userID).Scan(
			&p.Id, &p.UserId, &p.DepthMin, &p.DepthMax, &p.TimeStart, &p.TimeEnd, &p.MagnitudeMin, &p.MagnitudeMax, &p.LongitudeMin, &p.LongitudeMax, &p.LatitudeMin, &p.LatitudeMax,
		)
		if err != nil {
			http.Error(w, "Preference not found", http.StatusNotFound)
			return
		}

		json.NewEncoder(w).Encode(p)
	}
}

func updatePreference(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)
		id := vars["id"]

		// print the user
		fmt.Println("Update User ID: ", userID)

		var p Preference
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		_, err = db.Exec(`
            UPDATE preferences 
            SET depth_min = $1, depth_max = $2, time_start = $3, time_end = $4, magnitude_min = $5, magnitude_max = $6, 
                longitude_min = $7, longitude_max = $8, latitude_min = $9, latitude_max = $10 
            WHERE id = $11 AND user_id = $12`,
			p.DepthMin, p.DepthMax, p.TimeStart, p.TimeEnd, p.MagnitudeMin, p.MagnitudeMax,
			p.LongitudeMin, p.LongitudeMax, p.LatitudeMin, p.LatitudeMax, id, userID,
		)
		if err != nil {
			log.Println("Error updating preference:", err)
			http.Error(w, "Failed to update preference", http.StatusInternalServerError)
			return
		}

		fmt.Println("Updated preference with ID: ", id)

		w.WriteHeader(http.StatusNoContent)
	}
}

func deletePreference(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)
		id := vars["id"]

		fmt.Println("Deletion User ID: ", userID)

		_, err = db.Exec("DELETE FROM preferences WHERE id = $1 AND user_id = $2", id, userID)
		if err != nil {
			log.Println("Error deleting preference:", err)
			http.Error(w, "Failed to delete preference", http.StatusInternalServerError)
			return
		}

		fmt.Println("Deleted preference with ID: ", id)

		w.WriteHeader(http.StatusNoContent)
	}
}
