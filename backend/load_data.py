import psycopg2
import csv
import time

def load_earthquake_data(connection_string, file_path):
    print("Starting to load earthquake data...")
    # Connect to PostgreSQL database
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        print("Database connection successful.")
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return

    # Drop the earthquakes table if it exists
    try:
        cursor.execute("DROP TABLE IF EXISTS earthquakes")
        print("Dropped existing earthquakes table.")
    except Exception as e:
        print(f"Error dropping earthquakes table: {e}")
        return

    # Create the earthquakes table if it doesn't exist
    try:
        cursor.execute("""
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
        )""")
        print("Created earthquakes table.")
    except Exception as e:
        print(f"Error creating earthquakes table: {e}")
        return

    # Open and read the CSV file
    try:
        with open(file_path, mode='r') as file:
            reader = csv.reader(file)
            records = list(reader)  # Read all rows at once
            print(f"Read {len(records)} records from the CSV file.")
            for i, record in enumerate(records[1:]):  # Skip the header row
                try:
                    # Parse the data from CSV
                    time_unix = float(record[1])
                    time_obj = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time_unix / 1000))
                    latitude = float(record[2])
                    longitude = float(record[3])
                    depth = float(record[4])
                    magnitude = float(record[5])
                    place = record[6]
                    alert = record[7]
                    tsunami = int(record[8])
                    url = record[9]
                    
                    # Prepare the INSERT query
                    insert_query = """
                    INSERT INTO earthquakes (time, latitude, longitude, depth, magnitude, place, alert, tsunami, url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(insert_query, (time_obj, latitude, longitude, depth, magnitude, place, alert, tsunami, url))
                    if i % 100 == 0:
                        print(f"Inserted {i} records.")
                except Exception as e:
                    print(f"Error inserting record {i}: {e}")

            # Commit the transaction
            conn.commit()
            print("Transaction committed.")

    except Exception as e:
        print(f"Error reading CSV file: {e}")
    finally:
        # Close the database connection
        cursor.close()
        conn.close()
        print("Database connection closed.")

    print("Earthquake data loaded successfully")

# Example usage
if __name__ == "__main__":
    # Set your database connection string here
    connection_string = "postgresql://neondb_owner:npg_ErzuDHxh4Sd2@ep-bitter-cherry-a5jf9rpy-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
    
    # Provide the path to your CSV file
    file_path = "data/earthquakes.csv"
    
    # Call the function
    load_earthquake_data(connection_string, file_path)