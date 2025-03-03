'strict';

import supabase from "./supabaseClient.js";

const firstName = document.getElementById("first-name");
const lastName = document.getElementById("last-name");
const email = document.getElementById("email");



async function FetchUserInfo() {
    const {data:userData , error:authError} = await supabase.auth.getUser();

    if(authError || !userData?.user) {
        console.error(  "Error fetching user login:",
            authError?.message || "user logged in");
        return;
    }

    const userId = userData.user.id;

    const {data:userTableId, error:userError} = await supabase.from("users_table").select("id").eq("id",userId).single();


    if(userError) {
        console.error("error fetching user's id", userError.message);
        return;
    }

    const user = userTableId.id;

    const {data:usersTable, error:tableError} = await supabase.from("users_table").select("first_name, last_name, email").eq("id",user).single();

    if(tableError) {
        console.error("error fetching table",tableError.message);
        return;
    }

    firstName.textContent = usersTable.first_name;
    lastName.textContent = usersTable.last_name;
    email.textContent = usersTable.email;

    const userGreeting = document.getElementById("userGreeting");
    if(userGreeting) {
        userGreeting.innerHTML = `Welcome, <strong>${usersTable.first_name}</strong>`;
    }
}

FetchUserInfo();