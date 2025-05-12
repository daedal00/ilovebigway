document.addEventListener("DOMContentLoaded", () => {
  // --- Domain Check ---
  const EXPECTED_HOSTNAME = "www.imadethissitetoaskyououtforbigway.com";
  if (window.location.hostname !== EXPECTED_HOSTNAME) {
    console.warn(
      `Current hostname (${window.location.hostname}) does not match expected (${EXPECTED_HOSTNAME}). Hiding content.`
    );
    document.body.style.display = "none";
    // Optionally add a message for the user if accessed via wrong domain
    // document.body.innerHTML = '<p>Please access this site via the correct domain.</p>';
    // document.body.style.display = 'block'; // Make message visible if added
    return; // Stop script execution if domain doesn't match
  }

  // --- Configuration ---
  // IMPORTANT: Replace with your ACTUAL Render API URL during deployment
  const API_BASE_URL = "https://ilovebigway.onrender.com"; // Deployed backend URL
  // const API_BASE_URL = ''; // Use relative path for local testing

  // --- Server Status Elements ---
  const serverStatusIndicator = document.getElementById(
    "server-status-indicator"
  );
  const serverStatusText = document.getElementById("server-status-text");
  const serverStatusDot = document.getElementById("server-status-dot");
  const wakeServerBtn = document.getElementById("wake-server-btn");

  // --- Helper to Update Server Status UI ---
  function updateServerStatus(status, message, isPolling = false) {
    if (!serverStatusIndicator) return;

    serverStatusDot.className = "status-dot"; // Reset classes
    switch (status) {
      case "online":
        serverStatusText.textContent = message || "Server Status: Online";
        serverStatusDot.classList.add("status-online");
        wakeServerBtn.classList.add("hidden");
        wakeServerBtn.disabled = false; // Re-enable button if it was disabled
        break;
      case "offline":
        serverStatusText.textContent = message || "Server Status: Offline";
        serverStatusDot.classList.add("status-offline");
        // Only show button if not currently in the middle of polling wake-up
        if (!isPolling) {
          wakeServerBtn.classList.remove("hidden");
          wakeServerBtn.disabled = false; // Ensure button is enabled
        } else {
          // Keep button hidden/disabled if polling failed
          wakeServerBtn.classList.add("hidden");
          wakeServerBtn.disabled = true;
        }
        break;
      case "checking":
      default:
        serverStatusText.textContent = message || "Server Status: Checking...";
        serverStatusDot.classList.add("status-checking");
        wakeServerBtn.classList.add("hidden"); // Hide button while checking/waking
        // Optionally disable button while checking
        if (isPolling) {
          wakeServerBtn.disabled = true;
        } else {
          wakeServerBtn.disabled = false;
        }
        break;
    }
  }

  // --- Polling Variables ---
  let pollingIntervalId = null;
  let pollAttempts = 0;
  const MAX_POLL_ATTEMPTS = 10; // Try 10 times (e.g., 10 * 3s = 30 seconds)
  const POLLING_INTERVAL_MS = 3000; // Check every 3 seconds

  // --- Function to Poll Server Status (Used After Wake-Up Attempt) ---
  async function pollServerStatus() {
    pollAttempts++;
    console.log(
      `Polling server status (Attempt ${pollAttempts}/${MAX_POLL_ATTEMPTS})...`
    );
    try {
      const response = await fetch(API_BASE_URL, { method: "GET" });
      if (response.ok) {
        console.log("Polling successful: Server is online.");
        updateServerStatus("online");
        clearInterval(pollingIntervalId); // Stop polling on success
        pollingIntervalId = null;
      } else {
        console.warn(
          `Polling attempt ${pollAttempts}: Server responded non-OK (${response.status})`
        );
        if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          console.error(
            "Max polling attempts reached. Server failed to wake up."
          );
          // Update status to show failure, keep button hidden/disabled
          updateServerStatus(
            "offline",
            "Server failed to respond. Refresh?",
            true
          );
          clearInterval(pollingIntervalId);
          pollingIntervalId = null;
        }
        // Otherwise, continue polling (do nothing here, interval continues)
      }
    } catch (error) {
      console.error(`Polling attempt ${pollAttempts}: Network error:`, error);
      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        console.error("Max polling attempts reached after network errors.");
        // Update status to show failure, keep button hidden/disabled
        updateServerStatus(
          "offline",
          "Connection error during wake-up. Refresh?",
          true
        );
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
      // Otherwise, continue polling (do nothing here, interval continues)
    }
  }

  // --- Function to Manually Wake Up Render (Triggered by Button) ---
  async function wakeUpRenderBackend() {
    // Prevent starting multiple polling intervals
    if (pollingIntervalId) {
      console.log("Polling already in progress.");
      return;
    }

    console.log("Manual wake-up request initiated...");
    pollAttempts = 0; // Reset poll counter
    updateServerStatus("checking", "Server Status: Waking up...", true); // Set checking state, disable button

    // Start polling immediately after initiating wake-up
    pollingIntervalId = setInterval(pollServerStatus, POLLING_INTERVAL_MS);

    // Optional: Send one initial request immediately to kickstart the server,
    // but the main status update relies on the polling.
    fetch(API_BASE_URL, { method: "GET" }).catch((err) => {
      console.warn(
        "Initial wake-up ping failed (error ignored, polling handles status):",
        err
      );
    });
  }

  // --- Function to Check Initial Server Status on Load ---
  async function checkServerStatusInitial() {
    console.log("Initial server status check...");
    updateServerStatus("checking"); // Set initial state
    try {
      // Use a shorter timeout for the initial check maybe?
      const response = await fetch(API_BASE_URL, { method: "GET" });
      if (response.ok) {
        console.log("Initial check: Server is online.");
        updateServerStatus("online");
      } else {
        console.warn(
          `Initial check: Server offline or non-OK status: ${response.status}`
        );
        updateServerStatus("offline");
      }
    } catch (error) {
      console.error("Initial check: Error pinging server:", error);
      updateServerStatus("offline");
    }
  }

  // --- Call the initial status check function ---
  checkServerStatusInitial();

  // --- Add Event Listener for Wake Up Button ---
  if (wakeServerBtn) {
    wakeServerBtn.addEventListener("click", wakeUpRenderBackend);
  }

  // --- State & Elements ---
  let currentStepIndex = 0;
  let formData = {}; // Store form data across steps
  let storedPassword = ""; // Store the entered password for submission
  const loadingOverlay = document.getElementById("loading-overlay"); // Get loader

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
  const musicPlayerGif = document.getElementById("music-player-gif"); // Get reference to the GIF

  // --- Music Segments (Timestamps in seconds) ---
  const musicSegments = [
    { title: "The City (Evening) ~ City Folk", start: 0 },
    { title: "1 AM ~ City Folk", start: 130 }, // 2:10
    { title: "6 AM ~ New Horizons", start: 257 }, // 4:17
    { title: "K.K. Slider Intro ~ GameCube", start: 404 }, // 6:44
    { title: "7 AM ~ New Leaf", start: 501 }, // 8:21
    { title: "11 AM ~ New Leaf", start: 606 }, // 10:06
    { title: "10 PM ~ New Horizons", start: 606 + 1 * 60 + 37 }, // 11:43
    { title: "5 PM ~ GameCube", start: 849 }, // 14:09
    { title: "8 PM ~ New Leaf", start: 993 }, // 16:33
    { title: "Tom Nook's Announcement ~ New Horizons", start: 1089 }, // 18:09
    { title: "11 PM ~ New Leaf", start: 1189 }, // 19:49
    { title: "Exhibit Room ~ New Leaf", start: 1324 }, // 22:04
    { title: "2 AM ~ City Folk", start: 1399 }, // 23:19
    { title: "5 AM ~ GameCube", start: 1550 }, // 25:50
    { title: "Get Ready for Your Flight! ~ New Horizons", start: 1746 }, // 29:06
    { title: "8 AM ~ New Leaf", start: 1870 }, // 31:10
    { title: "4 PM ~ GameCube", start: 1966 }, // 32:46
    { title: "Able Sisters ~ New Horizons", start: 2106 }, // 35:06
    { title: "5 PM ~ New Leaf", start: 2220 }, // 37:00
    { title: "7 PM ~ GameCube", start: 2372 }, // 39:32
    { title: "10 PM ~ New Leaf", start: 2508 }, // 41:48
    { title: "1 AM ~ New Horizons", start: 2593 }, // 43:13
    { title: "1 AM ~ New Leaf", start: 2782 }, // 46:22
    { title: "2 AM ~ City Folk", start: 2909 }, // 48:29
    { title: "6 AM ~ City Folk", start: 3060 }, // 51:00
    { title: "11 AM ~ New Horizons", start: 3150 }, // 52:30
    { title: "Resident Services ~ New Horizons", start: 3329 }, // 55:29
    { title: "2 PM ~ New Leaf", start: 3480 }, // 58:00
    { title: "Nook's Cranny ~ New Horizons", start: 3583 }, // 59:43
    { title: "8 PM ~ City Folk", start: 3726 }, // 1:02:06
    { title: "Museum (Entrance) ~ City Folk", start: 3886 }, // 1:04:46
    { title: "9 PM ~ GameCube", start: 4011 }, // 1:06:51
    { title: "The Roost Cafe ~ New Leaf", start: 4175 }, // 1:09:35
  ];
  let currentSegmentIndex = 0;
  let isMusicSetup = false; // Flag for first play interaction

  // --- Helper Functions ---
  // Track form submission state
  let isSubmitting = false;

  function showThankYouContent(reason = null) {
    // Prevent multiple redirects
    if (isSubmitting) return;
    isSubmitting = true;

    // Disable form controls
    const allInputs = document.querySelectorAll("input, textarea, button");
    allInputs.forEach((el) => (el.disabled = true));

    // Show loading state if needed
    if (loadingOverlay) loadingOverlay.style.display = "block";

    // Construct the URL with the reason parameter
    const redirectUrl = reason
      ? `/thankyou.html?reason=${encodeURIComponent(reason)}`
      : "/thankyou.html?reason=submitted";

    // Use a short timeout to ensure UI updates are visible
    setTimeout(() => {
      // Redirect to thank you page
      window.location.href = redirectUrl;
    }, 100);
  }

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

  // --- New Music Logic ---
  function playSegment(index, resume = false) {
    if (index < 0 || index >= musicSegments.length) {
      console.error("Invalid segment index:", index);
      return;
    }
    currentSegmentIndex = index; // Ensure index is updated
    const segment = musicSegments[index];
    songTitleElement.textContent = segment.title;

    if (!resume) {
      backgroundMusic.currentTime = segment.start;
    }

    backgroundMusic
      .play()
      .then(() => {
        musicDisc.classList.add("playing");
        playPauseBtn.innerHTML = "&#10074;&#10074;"; // Pause symbol
        if (musicPlayerGif) musicPlayerGif.src = "assets/dance.gif"; // Play GIF
        isMusicSetup = true; // Mark setup as complete on successful play
      })
      .catch((error) => {
        // Ignore errors often caused by rapid seeking/playing
        if (error.name !== "AbortError") {
          console.warn("Audio play failed:", error);
          songTitleElement.textContent = "Playback error";
          musicDisc.classList.remove("playing");
          playPauseBtn.innerHTML = "&#9654;"; // Play symbol
          if (musicPlayerGif) musicPlayerGif.src = "assets/static.png"; // Show static on error
        }
      });
  }

  function togglePlayPause() {
    if (!isMusicSetup) {
      // First interaction: play the initial segment
      playSegment(currentSegmentIndex);
    } else if (backgroundMusic.paused) {
      // Resume playback (don't reset time)
      playSegment(currentSegmentIndex, true); // Pass resume flag
      // playSegment will set the src to dance.gif on successful play
    } else {
      // Pause playback
      backgroundMusic.pause();
      musicDisc.classList.remove("playing");
      playPauseBtn.innerHTML = "&#9654;"; // Play symbol
      if (musicPlayerGif) musicPlayerGif.src = "assets/static.png"; // Show static on pause
    }
  }

  function nextSegment() {
    let nextIndex = currentSegmentIndex + 1;
    if (nextIndex >= musicSegments.length) {
      nextIndex = 0; // Loop back to the beginning
    }
    playSegment(nextIndex);
  }

  function prevSegment() {
    let prevIndex = currentSegmentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = musicSegments.length - 1; // Wrap around to the end
    }
    playSegment(prevIndex);
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
    // Set initial title
    songTitleElement.textContent = musicSegments[currentSegmentIndex].title;

    // Play/Pause (Disc Click)
    musicDisc.addEventListener("click", togglePlayPause);

    // Play/Pause (Button Click)
    playPauseBtn.addEventListener("click", togglePlayPause);

    // Previous Button
    prevSongBtn.addEventListener("click", prevSegment);

    // Next Button
    nextSongBtn.addEventListener("click", nextSegment);

    // Auto-advance to next segment
    backgroundMusic.addEventListener("timeupdate", () => {
      const currentSegment = musicSegments[currentSegmentIndex];
      const nextSegmentIndex = currentSegmentIndex + 1;
      // Determine the end time for the current segment
      // If it's the last segment, let it play to the audio's end
      const endTime =
        nextSegmentIndex < musicSegments.length
          ? musicSegments[nextSegmentIndex].start
          : backgroundMusic.duration; // Use actual duration for the last segment

      // Check if current time is past the start of the next segment (or near the end of the file)
      // Add a small buffer (e.g., 0.5 seconds) to prevent skipping too early
      if (
        isMusicSetup && // Only advance if music has been started
        !backgroundMusic.paused && // Only advance if playing
        endTime && // Ensure endTime is valid
        backgroundMusic.currentTime >= endTime - 0.5 // Check against end time
      ) {
        console.log(`Segment '${currentSegment.title}' ended, advancing.`);
        nextSegment(); // This handles looping back to 0
      }
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
          if (musicPlayerGif) musicPlayerGif.src = "assets/static.png"; // Show static on modal pause
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

  // Set initial title even before play
  if (songTitleElement && musicSegments.length > 0) {
    songTitleElement.textContent = musicSegments[0].title;
  }
  // Set initial GIF state to static
  if (musicPlayerGif) {
    musicPlayerGif.src = "assets/static.png";
  }
});
