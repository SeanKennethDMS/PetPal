'use strict';

import supabase from "./supabaseClient.js";

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
  
    const updateIfExists = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
  
    updateIfExists("first-name", usersTable.first_name);
    updateIfExists("last-name", usersTable.last_name);
    updateIfExists("email", usersTable.email);
  
    const userGreeting = document.getElementById("userGreeting");
    if (userGreeting) {
      userGreeting.innerHTML = `Welcome, <strong>${usersTable.first_name}</strong>`;
    }
}

if (document.getElementById("first-name") || 
    document.getElementById("last-name") || 
    document.getElementById("email")) {
  FetchUserInfo();
}