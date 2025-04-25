document.addEventListener("DOMContentLoaded", () => {
  // --- Configuration ---
  // IMPORTANT: Replace with your ACTUAL Render API URL during deployment
  const API_BASE_URL = ""; // Use relative path for local testing
  // const API_BASE_URL = 'https://your-render-app-name.onrender.com'; // Example for deployment

  // --- !!! HARDCODED PASSWORD !!! ---
  // Replace "YOUR_SECRET_PASSWORD" with the actual password you want to use.
  // !! SECURITY WARNING: This password will be visible in the browser's source code. !!
  const CORRECT_PASSWORD = "test";

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

  // --- Event Listeners ---

  // Password Check (Frontend Only)
  passwordSubmitBtn.addEventListener("click", () => {
    // Removed async
    const password = passwordInput.value;
    if (!password) {
      passwordError.textContent = "Password cannot be empty.";
      return;
    }
    passwordError.textContent = ""; // Clear previous error

    // Direct comparison with the hardcoded password
    if (password === CORRECT_PASSWORD) {
      storedPassword = password; // Store password for final submission
      passwordStep.classList.remove("active");
      passwordStep.style.display = "none"; // Hide completely
      inviteForm.classList.remove("hidden");
      progressDotsContainer.style.display = "block"; // Show progress dots
      showStep(currentStepIndex);
    } else {
      passwordError.textContent = "Incorrect password.";
    }
    // Removed the fetch call and try/catch/finally block
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
      if (currentStepElement.id === "step-name")
        formData.name = nameInput.value.trim();
      if (currentStepElement.id === "step-availability")
        formData.availability = availabilityTextarea.value.trim();
      if (currentStepElement.id === "step-activities")
        formData.activities = activitiesTextarea.value.trim();

      // Special handling for Likelihood step
      if (currentStepElement.id === "step-likelihood") {
        const likelihood = getSelectedLikelihood();
        formData.likelihood = likelihood;

        if (likelihood === "mild" || likelihood === "medium") {
          // Show custom modal instead of confirm()
          likelihoodToRedirect = likelihood; // Store which value triggered it
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

    modalConfirmBtn.addEventListener("click", () => {
      hideModal();
      if (likelihoodToRedirect) {
        // Redirect to thank you page with reason
        window.location.href = `/thankyou.html?reason=${likelihoodToRedirect}`;
      }
      likelihoodToRedirect = null; // Reset
    });

    // Close modal if clicking outside the content area
    window.addEventListener("click", (event) => {
      if (event.target == confirmationModal) {
        hideModal();
        likelihoodToRedirect = null; // Reset if closed by clicking outside
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

        // Redirect to a thank you page
        window.location.href = "/thankyou.html";
      }
    } catch (error) {
      // Handle network errors or other unexpected issues
      console.error("Submission fetch error:", error);
      formError.textContent = "An unexpected error occurred. Please try again.";
    } finally {
      // Optional: Reset form or button state if needed
    }
  });

  // --- Initialization ---
  // Hide form and progress dots initially
  inviteForm.classList.add("hidden");
  if (progressDotsContainer) progressDotsContainer.style.display = "none";
  // Show only the password step on load (already handled by 'active' class, but good practice)
  // showStep(currentStepIndex); // No, wait for password
});
