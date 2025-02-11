import React, { useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";

const Globe = dynamic(() => import("../components/Globe"), { ssr: false });

const SignUp: React.FC = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const signUpUrl = `${apiUrl}/sign-up`;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordMatch, setPasswordMatch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !name || !password || !passwordMatch) {
      setError("Please fill out all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== passwordMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(signUpUrl, {
        email,
        password,
        name,
      });

      const { token } = response.data;
      // Store the token in localStorage or cookies
      localStorage.setItem("token", token);

      // Redirect user to a protected route or dashboard
      window.location.href = "/";
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-900">
      {/* Globe Background */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <Globe earthquakes={[]} />
      </div>

      {/* Sign Up Content */}
      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-2xl/9 font-bold tracking-tight text-white">
            Create an account
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-white/5 backdrop-blur-sm px-6 py-12 shadow sm:rounded-lg sm:px-12">
            {error && (
              <div className="bg-red-500/20 text-red-400 p-2 rounded mb-2 block text-sm/6 font-medium">
                {error}
              </div>
            )}
            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm/6 font-medium text-white"
                >
                  Name
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    name="name"
                    autoComplete="name"
                    className="block w-full rounded-md bg-white/10 px-3 py-1.5 text-base text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm/6 font-medium text-white"
                >
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    name="email"
                    autoComplete="email"
                    className="block w-full rounded-md bg-white/10 px-3 py-1.5 text-base text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm/6 font-medium text-white"
                >
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="block w-full rounded-md bg-white/10 px-3 py-1.5 text-base text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="passwordMatch"
                  className="block text-sm/6 font-medium text-white"
                >
                  Reenter Password
                </label>
                <div className="mt-2">
                  <input
                    id="passwordMatch"
                    name="passwordMatch"
                    type="password"
                    value={passwordMatch}
                    onChange={(e) => setPasswordMatch(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="block w-full rounded-md bg-white/10 px-3 py-1.5 text-base text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </button>
              </div>
            </form>
            <div className="relative mt-10">
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center"
              >
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm/6 font-medium">
                <span className="px-6 text-white">
                  Or sign in to your account
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4">
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-3 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-white/10 hover:bg-white/20 focus-visible:ring-transparent"
              >
                <span className="text-sm/6 font-semibold">Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
