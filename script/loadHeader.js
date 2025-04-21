function loadHeader() {
  fetch("header.html")
    .then((response) => response.text())
    .then((data) => {
      document.querySelector("header").innerHTML = data;
    })
    .catch((error) => console.error("Error loading header:", error));
}

// Call the function to load the header
loadHeader();