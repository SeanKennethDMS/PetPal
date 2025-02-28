import supabase from "./supabaseClient.js";

async function handleSignup(event) {
    event.preventDefault(); 

    const lastname = document.getElementById("lastname").value;
    const firstname = document.getElementById("firstname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    // Check if passwords match
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    // Sign up the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert("Sign-up failed: " + error.message);
        console.error("Sign-up error:", error);
        return;
    }

    // Insert user details into 'users' table in Supabase
    const { error: userError } = await supabase
        .from("users") // Ensure you have a "users" table in Supabase
        .insert([{ 
            id: data.user.id, // Store the user's unique ID
            lastname: lastname,
            firstname: firstname,
            email: email
        }]);

    if (userError) {
        alert("Failed to save user data: " + userError.message);
        console.error("Database insert error:", userError);
        return;
    }

    alert("Sign-up successful! Please check your email for verification.");
    closeModal('signupModal'); // Close modal after successful sign-up
}

function togglePassword(fieldId) {
    const input = document.getElementById(fieldId);
    input.type = input.type === "password" ? "text" : "password";
}


async function handleLogin(event) {
    event.preventDefault(); // Prevent page reload

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    // Authenticate user using Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Login failed: " + error.message);
        console.error("Login error:", error);
        return;
    }

    alert("Login successful! Redirecting...");
    window.location.href = "../public/pages/customer-dashboard.html"; // Redirect to dashboard
}

async function checkUserSession() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        console.log("No active session.");
        return; // Do nothing if no user is logged in
    }

    console.log("User is logged in:", data.user);
    window.location.href = "../public/pages/customer-dashboard.html"; // Redirect if logged in
}

// Run on page load
checkUserSession();


async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error("Logout error:", error);
        alert("Logout failed: " + error.message);
        return;
    }

    // Clear session storage (optional but recommended)
    localStorage.clear();
    sessionStorage.clear();

    alert("Logged out successfully!");
    window.location.href = "../public/index.html"; // Redirect to home page
}