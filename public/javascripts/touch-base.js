/* ========================================================================================
VARIABLES
======================================================================================== */

let touchBase = {
  // VARIABLES
  words: ["COMING SOON", "ENGINEERING KITS"],
  // FUNCTIONS
  initialise: undefined,
  subscription: undefined,
  subscribe: undefined
}

/* ========================================================================================
FUNCTIONS
======================================================================================== */

// @func  touchBase.initialise
// @desc  
touchBase.initialise = async () => {
  /*updateSessionPage();
  // GET LOGIN STATUS 
  let data;
  try {
    data = (await axios.get("/login-status"))["data"];
  } catch (error) {
    return console.log(error);
  }
  const login = data.status;*/
  // LOAD SYSTEMS
  try {
    //await global.initialise(true, true, login);
    await global.initialise();
  } catch (error) {
    return console.log(error);
  }
  // REMOVE STARTUP LOADER
  removeLoader();
  // LOAD SESSION
  //session.initialise();
  // ADD THE DYNAMIC WORDS EFFECT
  textSequence(0, touchBase.words, "change-text");
  //touchBase.subscription(login);
  touchBase.subscription();
}

// @func  touchBase.subscription
// @desc  
touchBase.subscription = (login = false) => {
  // INPUT FIELD DISPLAY
  if (login) {
    document.querySelector("#subscribe-field").classList.add("hide");
  }
  // BUTTON ATTRIBUTE
  document.querySelector("#subscribe-main").setAttribute("onclick", `touchBase.subscribe(${login});`);
}

// @func  touchBase.subscribe
// @desc  
touchBase.subscribe = async () => {
  document.querySelector("#subscribe-email-error").innerHTML = "";
  // DISABLE
  document.querySelector("#subscribe-main").setAttribute("disabled", "");
  // COLLECT
  const email = (!login) ? document.querySelector("#subscribe-email-input").value : "";
  // VALIDATE
  let emailRE = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (email === "") {
    document.querySelector("#subscribe-email-error").innerHTML = "an email is required";
    return document.querySelector("#subscribe-main").removeAttribute("disabled"); // ENABLE
  } else if (!emailRE.test(String(email).toLowerCase())) {
    document.querySelector("#subscribe-email-error").innerHTML = "invalid email";
    return document.querySelector("#subscribe-main").removeAttribute("disabled"); // ENABLE
  }
  // SUBMIT
  try {
    await global.subscribeToMailingList(email);
  } catch (error) {
    return document.querySelector("#subscribe-main").removeAttribute("disabled"); // ENABLE
  }
  return document.querySelector("#subscribe-main").removeAttribute("disabled"); // ENABLE
}

/* ========================================================================================
END
======================================================================================== */