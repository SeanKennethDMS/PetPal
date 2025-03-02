import supabase from "./supabaseClient.js";



window.handleSignup = async function (event) {
    event.preventDefault(); 

    const email = document.getElementById("sign-up-email").value;
    const password = document.getElementById("sign-up-password").value;
    const firstName = document.getElementById("first_name").value;
    const lastName = document.getElementById("last_name").value;

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
        .from("users_table") // Ensure you have a "users" table in Supabase
        .insert([{ 
            id: data.user.id, // Store the user's unique ID
            email: email,
            first_name: firstName,  // Add first name
            last_name: lastName
        }]);

    if (userError) {
        alert("Failed to save user data: " + userError.message);
        console.error("Database insert error:", userError);
        return;
    }

    alert("Sign-up successful! Please check your email for verification.");
    closeModal('signupModal'); // Close modal after successful sign-up
    openModal('loginModal');
}