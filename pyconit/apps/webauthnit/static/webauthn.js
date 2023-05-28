const { startRegistration, startAuthentication } = SimpleWebAuthnBrowser;

// Registration
const statusRegister = document.getElementById("statusRegister");
const dbgRegister = document.getElementById("dbgRegister");

// Authentication
const statusAuthenticate = document.getElementById("statusAuthenticate");
const dbgAuthenticate = document.getElementById("dbgAuthenticate");

function printToStatus(elemStatus, output) {
  elemStatus.innerHTML = output;
}

function resetStatus(elemStatus) {
  elemStatus.innerHTML = "";
}

function getPassStatus() {
  return "🍕";
}

function getFailureStatus(message) {
  return "💩";
}

/**
 * Register Button
 */
document
  .getElementById("btnRegister")
  .addEventListener("click", async () => {
    resetStatus(statusRegister);

    // Get options
    const resp = await fetch("/register?username=" + document.getElementById("username").value);
    const opts = await resp.json();

    // Start WebAuthn Registration
    let regResp;
    try {
      regResp = await startRegistration(opts);
    } catch (err) {
      printToStatus(statusRegister, getFailureStatus(err));
      throw new Error(err);
    }

    // Send response to server
    const verificationResp = await fetch(
      "/register?username=" + document.getElementById("username").value,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(regResp),
      }
    );

    // Report validation response
    const verificationRespJSON = await verificationResp.json();
    const { verified, msg } = verificationRespJSON;
    if (verified) {
      printToStatus(statusRegister, getPassStatus());
    } else {
      printToStatus(statusRegister, getFailureStatus(msg));
    }
  });

/**
 * Authenticate Button
 */
document
  .getElementById("btnAuthenticate")
  .addEventListener("click", async () => {
    resetStatus(statusAuthenticate);

    // Get options
    const resp = await fetch("/authenticate?username=" + document.getElementById("username").value);
    const opts = await resp.json();

    // Start WebAuthn Authentication
    let authResp;
    try {
      authResp = await startAuthentication(opts);
    } catch (err) {
      printToStatus(statusAuthenticate, getFailureStatus(err));
      throw new Error(err);
    }

    // Send response to server
    const verificationResp = await fetch(
      "/authenticate?username=" + document.getElementById("username").value,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authResp),
      }
    );

    // Report validation response
    const verificationRespJSON = await verificationResp.json();
    const { verified, msg } = verificationRespJSON;
    if (verified) {
      printToStatus(statusAuthenticate, getPassStatus());
    } else {
      printToStatus(statusAuthenticate, getFailureStatus(msg));
    }
  });


/**
 * Toggle between tabs
 */
document.querySelectorAll('.form input, .form textarea').forEach(function(element) {
  element.addEventListener('keyup', handleInput);
  element.addEventListener('blur', handleInput);
  element.addEventListener('focus', handleInput);
});

function handleInput(e) {
  var element = e.target;
  var label = element.previousElementSibling;

  if (e.type === 'keyup') {
    if (element.value === '') {
      label.classList.remove('active', 'highlight');
    } else {
      label.classList.add('active', 'highlight');
    }
  } else if (e.type === 'blur') {
    if (element.value === '') {
      label.classList.remove('active', 'highlight');
    } else {
      label.classList.remove('highlight');
    }
  } else if (e.type === 'focus') {
    if (element.value === '') {
      label.classList.remove('highlight');
    } else {
      label.classList.add('highlight');
    }
  }
}

document.querySelectorAll('.tab a').forEach(function(link) {
  link.addEventListener('click', function(e) {
    e.preventDefault();

    var parent = link.parentNode;
    parent.classList.add('active');
    resetStatus(statusAuthenticate);
    resetStatus(statusRegister);

    Array.from(parent.parentNode.children).forEach(function(sibling) {
      if (sibling !== parent) {
        sibling.classList.remove('active');
      }
    });

    var target = link.getAttribute('href');
    var tabContentDivs = document.querySelectorAll('.tab-content > div');

    tabContentDivs.forEach(function(div) {
      if (div !== document.querySelector(target)) {
        div.style.display = 'none';
      }
    });

    document.querySelector(target).style.display = 'block';
  });
});