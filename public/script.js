document.addEventListener("DOMContentLoaded", () => {
  // --- Configuration ---
  // IMPORTANT: Replace with your ACTUAL Render API URL during deployment
  const API_BASE_URL = ""; // Use relative path for local testing
  // const API_BASE_URL = 'https://your-render-app-name.onrender.com'; // Example for deployment

  // --- State & Elements ---
  let currentStepIndex = 0;
  let formData = {}; // Store form data across steps
  let storedPassword = ""; // Store the entered password for submission

  const steps = Array.from(document.querySelectorAll("#invite-form .step"));
  const passwordStep = document.getElementById("step-password");
  const passwordInput = document.getElementById("password");
  const passwordSubmitBtn = document.getElementById("password-submit");
  const passwordError = document.getElementById("password-error");
  const inviteForm = document.getElementById("invite-form");
  const formError = document.getElementById("form-error");
  const progressDotsContainer = document.querySelector(".progress-dots");

  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");

  // Step specific elements
  const nameInput = document.getElementById("name");
  const likelihoodRadios = document.querySelectorAll(
    'input[name="likelihood"]'
  );
  const availabilityTextarea = document.getElementById("availability");
  const activitiesTextarea = document.getElementById("activities");
  const contactInput = document.getElementById("contactNumber");

  // Modal elements
  const confirmationModal = document.getElementById("confirmation-modal");
  const modalMessage = document.getElementById("modal-message");
  const closeModalBtn = document.querySelector(".close-modal-btn");
  const modalConfirmBtn = document.getElementById("modal-confirm-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  let likelihoodToRedirect = null; // Store likelihood when modal is shown

  // Music elements
  const musicDisc = document.getElementById("music-disc");
  const backgroundMusic = document.getElementById("background-music");
  const songTitleElement = document.getElementById("song-title");
  const prevSongBtn = document.getElementById("prev-song-btn");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const nextSongBtn = document.getElementById("next-song-btn");
  const volumeBar = document.getElementById("volume-bar");

  // Music Playlist & Titles
  const playlist = ["broken.mp3", "life.mp3", "rains.mp3", "starry.mp3"];
  const songTitles = {
    "broken.mp3": "broken melodies",
    "life.mp3": "life is still going on",
    "rains.mp3": "rains in heaven",
    "starry.mp3": "starry night",
  };
  let currentSongIndex = 0;
  let isMusicSetup = false; // Flag to load first song only once

  // --- Helper Functions ---
  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle("active", i === index);
    });
    updateProgressDots(index);
    // Clear general form error on step change
    if (formError) formError.textContent = "";
  }

  function updateProgressDots(activeIndex) {
    if (!progressDotsContainer) return;
    progressDotsContainer.innerHTML = ""; // Clear existing dots
    steps.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.classList.add("dot");
      dot.classList.toggle("active", i === activeIndex);
      progressDotsContainer.appendChild(dot);
    });
  }

  function getSelectedLikelihood() {
    for (const radio of likelihoodRadios) {
      if (radio.checked) {
        return radio.value;
      }
    }
    return null;
  }

  function displayError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearError(elementId) {
    displayError(elementId, "");
  }

  function validateStep(index) {
    clearError(`step-${steps[index].id.split("-")[1]}-error`); // Clear previous error for this step

    switch (steps[index].id) {
      case "step-name":
        if (!nameInput.value.trim()) {
          displayError("name-error", "Please enter your name.");
          return false;
        }
        break;
      case "step-likelihood":
        if (!getSelectedLikelihood()) {
          displayError("likelihood-error", "Please select an option.");
          return false;
        }
        break;
      case "step-contact":
        // Basic phone validation (optional but good)
        const phoneRegex = /^\+?[\d\s\-\(\)]{7,}$/; // Simple regex, adjust if needed
        if (contactInput.value.trim() && !phoneRegex.test(contactInput.value)) {
          displayError(
            "contact-error",
            "Please enter a valid phone number format."
          );
          return false;
        }
        break;
      // Add validation for other steps if necessary (availability, activities are optional here)
    }
    return true;
  }

  function showModal(message) {
    if (!confirmationModal) return;
    modalMessage.textContent = message || "Are you sure?"; // Default message
    confirmationModal.classList.remove("hidden");
    confirmationModal.style.display = "block"; // Use style.display for initial show
  }

  function hideModal() {
    if (!confirmationModal) return;
    confirmationModal.classList.add("hidden");
    // Allow time for fade-out animation if needed
    setTimeout(() => {
      confirmationModal.style.display = "none";
    }, 300);
  }

  function loadAndPlaySong(index) {
    if (index < 0 || index >= playlist.length) {
      console.error("Invalid song index:", index);
      return;
    }
    const songName = playlist[index];
    backgroundMusic.src = `/assets/music/${songName}`;
    // Use the mapping for the title
    songTitleElement.textContent =
      songTitles[songName] || songName.replace(/\.mp3$/i, ""); // Fallback to filename if mapping missing

    backgroundMusic
      .play()
      .then(() => {
        musicDisc.classList.add("playing");
        playPauseBtn.innerHTML = "&#10074;&#10074;"; // Pause symbol
      })
      .catch((error) => {
        console.warn("Audio play failed:", error);
        songTitleElement.textContent = "Playback error";
        musicDisc.classList.remove("playing");
        playPauseBtn.innerHTML = "&#9654;"; // Play symbol
      });
  }

  function togglePlayPause() {
    if (!isMusicSetup) {
      // First interaction: load and play the initial song
      loadAndPlaySong(currentSongIndex);
      isMusicSetup = true;
      // loadAndPlaySong already sets pause symbol and playing class
    } else if (backgroundMusic.paused) {
      // Resume playback
      backgroundMusic
        .play()
        .then(() => {
          musicDisc.classList.add("playing");
          playPauseBtn.innerHTML = "&#10074;&#10074;"; // Pause symbol
          // Update title in case it showed an error before
          const currentSongName = playlist[currentSongIndex];
          songTitleElement.textContent =
            songTitles[currentSongName] ||
            currentSongName.replace(/\.mp3$/i, "");
        })
        .catch((error) => {
          console.warn("Audio resume failed:", error);
          songTitleElement.textContent = "Playback error";
          musicDisc.classList.remove("playing");
          playPauseBtn.innerHTML = "&#9654;"; // Play symbol
        });
    } else {
      // Pause playback
      backgroundMusic.pause();
      musicDisc.classList.remove("playing");
      playPauseBtn.innerHTML = "&#9654;"; // Play symbol
    }
  }

  // Function to load and display thank you content dynamically
  async function showThankYouContent(reason) {
    try {
      const response = await fetch("/thankyou.html");
      if (!response.ok) {
        throw new Error(
          `Failed to fetch thankyou.html: ${response.statusText}`
        );
      }
      const thankYouHtml = await response.text();

      // Parse the fetched HTML
      const parser = new DOMParser();
      const thankYouDoc = parser.parseFromString(thankYouHtml, "text/html");

      // Extract the content we want (e.g., the container div)
      const thankYouContent = thankYouDoc.querySelector(".container"); // Assuming structure
      const mainContainer = document.querySelector(".container");
      const formWrapper = document.getElementById("invite-form"); // Get the form
      const passwordWrapper = document.getElementById("step-password"); // Get password step
      const pointerGroup = document.getElementById("pointer-group"); // Get pointer

      if (mainContainer && thankYouContent) {
        // Hide original form/password elements completely
        if (formWrapper) formWrapper.style.display = "none";
        if (passwordWrapper) passwordWrapper.style.display = "none";
        if (progressDotsContainer) progressDotsContainer.style.display = "none";
        if (pointerGroup) pointerGroup.style.display = "none";

        // Replace the content
        mainContainer.innerHTML = thankYouContent.innerHTML;
        mainContainer.classList.add("thank-you-state"); // Add a class for potential styling

        // Re-run the script logic from thankyou.html (adapted)
        const messageElement =
          mainContainer.querySelector("#thank-you-message");
        const titleElement = mainContainer.querySelector("#thank-you-title");
        const imageElement = mainContainer.querySelector("#thank-you-image");

        if (!messageElement || !titleElement || !imageElement) {
          console.error(
            "Could not find all thank you elements after injection."
          );
          mainContainer.innerHTML =
            "<h1>Thanks!</h1><p>Your submission was received.</p><a href='/'>Back Home</a>"; // Fallback
          return;
        }

        let imageUrl = "assets/study.jpeg"; // Default image from thankyou.html

        if (reason === "mild" || reason === "medium") {
          messageElement.textContent = "Fair enough!";
          titleElement.textContent = "Acknowledged.";
          imageUrl = "assets/thumb.jpeg";
        } else {
          // Default message for full submission (no specific reason needed)
          titleElement.textContent = "Got your response!";
          messageElement.textContent = "I will get back to you soon:)";
        }

        imageElement.src = imageUrl;
        imageElement.style.display = "block"; // Ensure image is visible

        // --- Attempt to resume music ---
        if (backgroundMusic && !backgroundMusic.paused) {
          // If music was playing, try to ensure it continues
          // A short delay might help if the pause is due to intensive DOM manipulation
          setTimeout(() => {
            backgroundMusic
              .play()
              .catch((e) =>
                console.warn("Could not resume music after thank you:", e)
              );
          }, 50); // Small delay
        } else if (backgroundMusic && backgroundMusic.paused && isMusicSetup) {
          // If music was paused but had been set up, leave it paused
          console.log("Music was paused, leaving it paused.");
        }
      } else {
        console.error("Could not find main container or thank you content.");
        // Fallback: redirect if injection fails
        window.location.href = `/thankyou.html?reason=${reason || "submitted"}`;
      }
    } catch (error) {
      console.error("Error loading thank you content:", error);
      // Fallback: redirect on error
      window.location.href = `/thankyou.html?reason=${reason || "submitted"}`;
    }
  }

  // --- Event Listeners ---

  // Password Check (Backend Call)
  passwordSubmitBtn.addEventListener("click", async () => {
    // Make async
    const password = passwordInput.value;
    if (!password) {
      passwordError.textContent = "Password cannot be empty.";
      return;
    }
    passwordError.textContent = "Verifying..."; // Provide feedback

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password }), // Send password in body
      });

      if (response.ok) {
        // Status 200-299 means success
        console.log("Password verified by server.");
        passwordError.textContent = ""; // Clear error/verifying message
        // storedPassword = password; // No need to store it anymore
        passwordStep.classList.remove("active");
        passwordStep.style.display = "none"; // Hide completely
        inviteForm.classList.remove("hidden");
        progressDotsContainer.style.display = "block"; // Show progress dots
        showStep(currentStepIndex);
      } else {
        // Handle errors (401 Unauthorized, 400 Bad Request, 500 Server Error)
        const data = await response.json().catch(() => ({})); // Try to parse error message
        console.error(
          "Password verification failed:",
          response.status,
          data.message
        );
        passwordError.textContent =
          data.message || "Incorrect password or server error.";
      }
    } catch (error) {
      console.error("Fetch error during password verification:", error);
      passwordError.textContent = "Network error. Could not verify password.";
    }
  });
  // Allow Enter key for password submission
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      passwordSubmitBtn.click();
    }
  });

  // Next Buttons
  nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!validateStep(currentStepIndex)) {
        return;
      }

      // Store data from current step
      const currentStepElement = steps[currentStepIndex];
      if (currentStepElement.id === "step-name") {
        formData.name = nameInput.value.trim();
      }
      if (currentStepElement.id === "step-availability") {
        formData.availability = availabilityTextarea.value.trim();
      }
      if (currentStepElement.id === "step-activities") {
        formData.activities = activitiesTextarea.value.trim();
      }

      // Special handling for Likelihood step
      if (currentStepElement.id === "step-likelihood") {
        const likelihood = getSelectedLikelihood();
        formData.likelihood = likelihood; // Store likelihood

        // Ensure name is stored if moving from name step directly to likelihood modal
        if (!formData.name && nameInput.value) {
          formData.name = nameInput.value.trim();
        }

        if (likelihood === "mild" || likelihood === "medium") {
          // Show custom modal instead of confirm()
          likelihoodToRedirect = likelihood; // Store which value triggered it for redirect later
          showModal(
            "Selecting this means you won't see the rest of the cool site. Are you sure you want to proceed?"
          );
          return; // Stop processing, wait for modal interaction
        }
        // If 'hot' or 'bigway_hot', proceed normally (fall through)
      }

      // Move to next step (only if not stopped by modal)
      if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        showStep(currentStepIndex);
      }
    });
  });

  // Previous Buttons
  prevButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        showStep(currentStepIndex);
      }
    });
  });

  // Modal Button Listeners
  if (confirmationModal) {
    closeModalBtn.addEventListener("click", hideModal);
    modalCancelBtn.addEventListener("click", hideModal);

    modalConfirmBtn.addEventListener("click", async () => {
      // Make async
      hideModal();
      if (likelihoodToRedirect) {
        // Instead of redirecting, submit the form data collected so far
        console.log("Submitting partial data from modal:", formData);
        if (formError) formError.textContent = "Submitting..."; // Indicate submission

        try {
          const response = await fetch(`${API_BASE_URL}/submit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            // Send only the data we have (name, likelihood)
            body: JSON.stringify({
              name: formData.name,
              likelihood: formData.likelihood,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error(
              "Server error (",
              response.status,
              "):",
              data.message || response.statusText
            );
            if (formError)
              formError.textContent = `Error: ${
                data.message || response.statusText
              }`;
            if (data.errors && formError) {
              formError.textContent += `\nDetails: ${data.errors.join(", ")}`;
            }
          } else {
            // SUCCESS!
            console.log("Partial submission successful:", data);
            if (formError) formError.textContent = ""; // Clear error
            // Load thank you content INSTEAD of redirecting
            showThankYouContent(likelihoodToRedirect);
          }
        } catch (error) {
          console.error("Partial submission fetch error:", error);
          if (formError)
            formError.textContent =
              "An unexpected error occurred. Please try again.";
        }
        // Reset likelihoodToRedirect only after attempting submission
        likelihoodToRedirect = null;
      } else {
        // This case should not normally be hit if modal is only shown for likelihood
        console.warn(
          "Modal confirm clicked without likelihoodToRedirect being set."
        );
      }
    });

    // Close modal if clicking outside the content area
    window.addEventListener("click", (event) => {
      if (event.target == confirmationModal) {
        hideModal();
        // likelihoodToRedirect = null; // Reset if closed by clicking outside - Let's not reset here
      }
    });
  }

  // Form Submission
  inviteForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default HTML form submission

    if (!validateStep(currentStepIndex)) {
      return;
    }

    // Gather final data
    formData.contactNumber = contactInput.value.trim();
    // formData.password = storedPassword; // REMOVED - No longer sending password

    console.log("Submitting data:", formData);
    formError.textContent = "Submitting..."; // Indicate submission start

    try {
      const response = await fetch(`${API_BASE_URL}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        // Handle HTTP errors (like 400, 500)
        console.error(
          "Server error (",
          response.status,
          "):",
          data.message || response.statusText
        );
        formError.textContent = `Error: ${data.message || response.statusText}`;
        if (data.errors) {
          // Display specific validation errors if available
          formError.textContent += `\nDetails: ${data.errors.join(", ")}`;
        }
      } else {
        // SUCCESS!
        console.log("Submission successful:", data);
        formError.textContent = ""; // Clear any previous errors

        // Load thank you content INSTEAD of redirecting
        showThankYouContent(); // No specific reason needed for full submission
      }
    } catch (error) {
      // Handle network errors or other unexpected issues
      console.error("Submission fetch error:", error);
      formError.textContent = "An unexpected error occurred. Please try again.";
    } finally {
      // Optional: Reset form or button state if needed
    }
  });

  // Music Player Listeners
  if (
    musicDisc &&
    backgroundMusic &&
    songTitleElement &&
    prevSongBtn &&
    playPauseBtn &&
    nextSongBtn &&
    volumeBar
  ) {
    // Play/Pause (Disc Click)
    musicDisc.addEventListener("click", togglePlayPause);

    // Play/Pause (Button Click)
    playPauseBtn.addEventListener("click", togglePlayPause);

    // Previous Button
    prevSongBtn.addEventListener("click", () => {
      currentSongIndex--;
      if (currentSongIndex < 0) {
        currentSongIndex = playlist.length - 1; // Wrap around to the end
      }
      loadAndPlaySong(currentSongIndex);
      playPauseBtn.innerHTML = "&#10074;&#10074;"; // Pause symbol
    });

    // Next Button
    nextSongBtn.addEventListener("click", () => {
      currentSongIndex++;
      if (currentSongIndex >= playlist.length) {
        currentSongIndex = 0; // Loop back to the beginning
      }
      loadAndPlaySong(currentSongIndex);
      playPauseBtn.innerHTML = "&#10074;&#10074;"; // Pause symbol
    });

    // Next Song on End
    backgroundMusic.addEventListener("ended", () => {
      currentSongIndex++;
      if (currentSongIndex >= playlist.length) {
        currentSongIndex = 0; // Loop back to the beginning
      }
      loadAndPlaySong(currentSongIndex);
    });

    // Volume Control
    volumeBar.addEventListener("input", () => {
      backgroundMusic.volume = volumeBar.value;
    });

    // Initialize volume bar value (optional, but good practice)
    volumeBar.value = backgroundMusic.volume;

    // Stop music on modal confirm
    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener("click", () => {
        if (likelihoodToRedirect) {
          backgroundMusic.pause();
          musicDisc.classList.remove("playing");
          playPauseBtn.innerHTML = "&#9654;"; // Play symbol
        }
      });
    }
  }

  // --- Initialization ---
  // Hide form and progress dots initially
  inviteForm.classList.add("hidden");
  if (progressDotsContainer) progressDotsContainer.style.display = "none";
  // Show only the password step on load (already handled by 'active' class, but good practice)
  // showStep(currentStepIndex); // No, wait for password
});
