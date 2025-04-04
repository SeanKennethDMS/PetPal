import supabase from "./supabaseClient.js";

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Add the missing showError function
function showError(message) {
    const errorContainer = document.getElementById('signup-error-container');
    errorContainer.innerHTML = `
        <div class="error-message" style="color: red; margin-bottom: 1rem;">
            ${message}
        </div>
    `;
}

async function handleSignup(event) {
    event.preventDefault();
    
    const signupBtn = document.getElementById('signupBtn');
    signupBtn.disabled = true;
    
    try {
        const email = document.getElementById("sign-up-email").value.trim();
        const password = document.getElementById("sign-up-password").value;
        const firstName = document.getElementById("first_name").value.trim();
        const lastName = document.getElementById("last_name").value.trim();

        // Clear previous errors
        document.getElementById('signup-error-container').innerHTML = '';

        // Validate inputs
        if (!email || !password || !firstName || !lastName) {
            showError("Please fill all fields");
            return;
        }

        if (password.length < 6) {
            showError("Password must be at least 6 characters");
            return;
        }

        // Sign up user
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName
                }
            }
        });

        if (error) throw error;

        // Insert into users table
        const { error: dbError } = await supabase
            .from("users_table")
            .insert([{
                id: data.user.id,
                email: email,
                first_name: firstName,
                last_name: lastName
            }]);

        if (dbError) throw dbError;

        alert("Sign-up successful! Please check your email for verification.");
        closeModal('signupModal');
        openModal('loginModal');

    } catch (error) {
        console.error("Signup error:", error);
        showError(error.message || "Signup failed. Please try again.");
    } finally {
        signupBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Use form submission instead of button click
    document.getElementById('signupForm')?.addEventListener('submit', handleSignup);

    document.getElementById('closeSignupModalBtn')?.addEventListener('click', () => {
        closeModal('signupModal');
    });

    document.getElementById('openLoginFromSignup')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('signupModal');
        openModal('loginModal');
    });
});