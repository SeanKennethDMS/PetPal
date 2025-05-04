import supabase from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");

  // Check if the calendar element is found
  if (!calendarEl) {
    console.error("Calendar element not found!");
    return;
  }

  // Check if FullCalendar is loaded
  if (typeof FullCalendar === "undefined") {
    console.error("FullCalendar not loaded.");
    return;
  } else {
    console.log("FullCalendar is loaded");
  }

  const userId = await getUserId();
  if (!userId) return;

  const events = await fetchAppointments(userId); // ✅ FIXED: Now defined below

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 300,
    headerToolbar: {
      start: "title",
      center: "",
      end: "prev,next today",
    },
    events,
    eventColor: "#3882F6",
    eventTextColor: "white",
  });

  calendar.render();
});

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.error("Auth error or user not logged in:", error);
    return null;
  }
  return data.user.id;
}

async function getUserRole(userId) {
  const { data, error } = await supabase
    .from("users_table")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return data?.role;
}

async function fetchAppointments(userId) {
  const role = await getUserRole(userId);
  if (!role) {
    console.error("Unable to determine user role");
    return [];
  }

  if (role === "admin") {
    return await fetchAdminEvents();
  } else {
    return await fetchCustomerEvents(userId);
  }
}

async function fetchCustomerEvents(userId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_date, pets(pet_name), services(name)")
    .eq("user_id", userId)
    .not("status", "eq", "cancelled");

  if (error) {
    console.error("Failed to load customer appointments:", error);
    return [];
  }

  return data.map((app) => ({
    title: `${app.pets?.pet_name} • ${app.services?.name}`,
    start: app.appointment_date,
  }));
}

async function fetchAdminEvents() {
  const { data: appointments, error: appError } = await supabase
    .from("appointments")
    .select("appointment_date, pets(pet_name), services(name), user_id")
    .not("status", "eq", "cancelled");

  if (appError) {
    console.error("Failed to load appointments for admin:", appError);
    return [];
  }

  const { data: stockItems, error: stockError } = await supabase
    .from("stock")
    .select("name, expiration_date");

  if (stockError) {
    console.error("Failed to load stock items:", stockError);
    return [];
  }

  const appointmentEvents = appointments.map((app) => ({
    title: `${app.pets?.pet_name} • ${app.services?.name} (Customer: ${app.user_id})`,
    start: app.appointment_date,
    color: "#3882F6",
    textColor: "white",
  }));
  vents;
  const stockEvents = stockItems.map((stock) => ({
    title: `${stock.name} Expiring`,
    start: stock.expiration_date,
    color: "#FF5733",
    textColor: "white",
  }));

  return [...appointmentEvents, ...stockEvents];
}
