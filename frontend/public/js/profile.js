'use strict';

import supabase from "./supabaseClient.js";

const firstName = document.getElementById("first-name");
const lastName = document.getElementById("last-name");
const email = document.getElementById("email");

async function FetchUserInfo() {
    const { data: userData, error: authError } = await supabase.auth.getUser();
  
    if (authError || !userData?.user) {
      console.error("Error fetching user login:", authError?.message || "user not logged in");
      return;
    }
  
    const userId = userData.user.id; 
  
    const { data: usersTable, error: tableError } = await supabase
      .from("users_table")
      .select("first_name, last_name, email")
      .eq("id", userId) 
      .single();
  
    if (tableError || !usersTable) {
      console.error("Error fetching user details from table", tableError?.message || "No profile data found");
      return;
    }
  
    firstName.textContent = usersTable.first_name;
    lastName.textContent = usersTable.last_name;
    email.textContent = usersTable.email;
  
    const userGreeting = document.getElementById("userGreeting");
    if (userGreeting) {
      userGreeting.innerHTML = `Welcome, <strong>${usersTable.first_name}</strong>`;
    }
  }

FetchUserInfo();
