import supabase from "./supabaseClient.js";


const loginBtn = document.querySelector(".loginBtn");
loginBtn.addEventListener("click", async function (event) {
    event.preventDefault(); 
    console.log("Login button clicked!");  //Check if this appears

    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    // Authenticate user with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Login failed: " + error.message);
        console.error("Login error:", error);
        return;
    }

    if (!data.user) {
        alert("Invalid login credentials.");
        return;
    }

    alert("Login successful!");

    // Fix: Ensure `userData` is correctly retrieved
    const { data: userData, error: userError } = await supabase
        .from("users_table")
        .select("role")
        .eq("email", email) // Match with user's email
        .single();

    if (userError || !userData) {
        alert("Error retrieving user role or user not found.");
        console.error("User role fetch error:", userError?.message);
        return;
    }

    // Save user role in local storage
    localStorage.setItem("userSession", JSON.stringify(data.user));
    localStorage.setItem("userRole", userData.role);  

    // Redirect user based on role
    if (userData.role === "admin") {
        window.location.href = "./pages/admin-dashboard.html";
    } else if (userData.role === "customer") {
        window.location.href = "./pages/customer-dashboard-orig.html";
    } else {
        alert("Invalid user role!");
    }
})
