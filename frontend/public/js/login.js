import supabase from "./supabaseClient.js";

const loginBtn = document.querySelector(".loginBtn");

loginBtn.addEventListener("click", async function (event) {
    event.preventDefault();
    console.log("Login button clicked!");

    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    // Authenticate via Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error || !data.user) {
        alert("Login failed: " + (error?.message || "Invalid credentials."));
        console.error("Login error:", error);
        return;
    }

    const userId = data.user.id;

    // Fetch role_type from users_table
    const { data: userData, error: userError } = await supabase
        .from("users_table")
        .select("role_type")
        .eq("id", userId)
        .single();

    if (userError || !userData?.role_type) {
        alert("Error retrieving user role.");
        console.error("User role fetch error:", userError);
        return;
    }

    const role = userData.role_type;

    // Save session and role_type in localStorage
    localStorage.setItem("userSession", JSON.stringify(data.user));
    localStorage.setItem("userRole", role);

    alert("Login successful!");

    // Redirect based on role_type
    if (role === "business_admin" || role === "system_admin") {
        window.location.href = "./pages/admin-dashboard.html";
    } else if (role === "customer") {
        window.location.href = "./pages/customer-dashboard.html";
    } else {
        alert("Unrecognized user role.");
        console.error("Unrecognized role_type:", role);
    }
});
