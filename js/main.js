// ===================== Elements =====================
var nameInput = document.getElementById("nameInput");
var phoneInput = document.getElementById("phoneInput");
var emailInput = document.getElementById("emailInput");
var addressInput = document.getElementById("addressInput");
var groupInput = document.getElementById("groupInput");
var notesInput = document.getElementById("notesInput");
var favInput = document.getElementById("favInput");
var emgInput = document.getElementById("emgInput");
var photoInput = document.getElementById("photoInput");
var photoPreview = document.getElementById("photoPreview");
var searchInput = document.getElementById("searchInput");
var contactForm = document.getElementById("contactForm");
var modalTitle = document.getElementById("modalTitle");
var saveBtn = document.getElementById("saveBtn");

var modalEl = document.getElementById("contactModal");
var contactModal = new bootstrap.Modal(modalEl);

var STORAGE_KEY = "contacts";
var contacts = loadContacts();
var editingId = null; // null = add mode, otherwise id of contact being edited
var currentPhoto = ""; // base64 image of the form

// ===================== Validation =====================
var rules = {
  nameInput: /^[a-zA-Z؀-ۿ ]{2,50}$/,
  phoneInput: /^(\+20|0020|0)?1[0125][0-9]{8}$/, // Egyptian mobile
  emailInput: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
};

function validateInput(input) {
  var value = input.value.trim();
  // Email is optional: empty is valid
  if (input === emailInput && value === "") {
    input.classList.remove("is-invalid", "is-valid");
    return true;
  }
  var isValid = rules[input.id].test(value);
  input.classList.toggle("is-valid", isValid);
  input.classList.toggle("is-invalid", !isValid);
  return isValid;
}

[nameInput, phoneInput, emailInput].forEach(function (input) {
  input.addEventListener("input", function () {
    validateInput(input);
  });
});

// ===================== LocalStorage =====================
function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveContacts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    return true;
  } catch (e) {
    Swal.fire({ icon: "error", title: "Storage full", text: "Could not save. Try a smaller photo." });
    return false;
  }
}

// ===================== Helpers =====================
function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function getInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
}

function avatarHTML(contact) {
  if (contact.photo) {
    return '<div class="avatar"><img src="' + contact.photo + '" alt="' + escapeHTML(contact.name) + '"></div>';
  }
  return '<div class="avatar">' + escapeHTML(getInitials(contact.name)) + "</div>";
}

function findIndex(id) {
  return contacts.findIndex(function (c) { return c.id === id; });
}

// ===================== Photo =====================
// Resize image to keep localStorage small
photoInput.addEventListener("change", function () {
  var file = photoInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    Swal.fire({ icon: "error", title: "Invalid file", text: "Please choose an image." });
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var size = 150;
      var canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext("2d");
      var min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      currentPhoto = canvas.toDataURL("image/jpeg", 0.8);
      showPhotoPreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function showPhotoPreview() {
  photoPreview.innerHTML = currentPhoto
    ? '<img src="' + currentPhoto + '" alt="preview">'
    : '<i class="fa-solid fa-user"></i>';
}

// ===================== Modal open (Add / Edit) =====================
function resetForm() {
  contactForm.reset();
  [nameInput, phoneInput, emailInput].forEach(function (i) {
    i.classList.remove("is-valid", "is-invalid");
  });
  currentPhoto = "";
  photoInput.value = "";
  showPhotoPreview();
}

document.getElementById("openAddBtn").addEventListener("click", function () {
  editingId = null;
  resetForm();
  modalTitle.textContent = "Add New Contact";
  saveBtn.textContent = "Save Contact";
  contactModal.show();
});

function openEdit(id) {
  var contact = contacts[findIndex(id)];
  if (!contact) return;
  editingId = id;
  resetForm();
  nameInput.value = contact.name;
  phoneInput.value = contact.phone;
  emailInput.value = contact.email;
  addressInput.value = contact.address;
  groupInput.value = contact.group;
  notesInput.value = contact.notes;
  favInput.checked = contact.favorite;
  emgInput.checked = contact.emergency;
  currentPhoto = contact.photo || "";
  showPhotoPreview();
  modalTitle.textContent = "Edit Contact";
  saveBtn.textContent = "Update Contact";
  contactModal.show();
}

// ===================== Save (Add / Update) =====================
contactForm.addEventListener("submit", function (e) {
  e.preventDefault();

  var isNameValid = validateInput(nameInput);
  var isPhoneValid = validateInput(phoneInput);
  var isEmailValid = validateInput(emailInput);

  if (!isNameValid || !isPhoneValid || !isEmailValid) {
    Swal.fire({ icon: "error", title: "Invalid data", text: "Please fix the highlighted fields first." });
    return;
  }

  var phone = phoneInput.value.trim();
  var duplicate = contacts.some(function (c) { return c.phone === phone && c.id !== editingId; });
  if (duplicate) {
    Swal.fire({ icon: "warning", title: "Duplicate phone", text: "A contact with this phone number already exists." });
    return;
  }

  var data = {
    name: nameInput.value.trim(),
    phone: phone,
    email: emailInput.value.trim(),
    address: addressInput.value.trim(),
    group: groupInput.value,
    notes: notesInput.value.trim(),
    favorite: favInput.checked,
    emergency: emgInput.checked,
    photo: currentPhoto
  };

  var previous = contacts.slice();
  var isEdit = editingId !== null;
  if (isEdit) {
    data.id = editingId;
    contacts[findIndex(editingId)] = data;
  } else {
    data.id = Date.now();
    contacts.push(data);
  }

  if (!saveContacts()) {
    contacts = previous; // rollback if storage failed
    return;
  }

  contactModal.hide();
  render();
  Swal.fire({
    icon: "success",
    title: isEdit ? "Updated!" : "Added!",
    text: isEdit ? "Contact has been updated successfully." : "Contact has been added successfully.",
    timer: 1600,
    showConfirmButton: false
  });
});

// ===================== Delete =====================
function deleteContact(id) {
  var contact = contacts[findIndex(id)];
  if (!contact) return;
  Swal.fire({
    title: "Are you sure?",
    html: "You are about to delete <b>" + escapeHTML(contact.name) + "</b>. This can't be undone!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Yes, delete it!"
  }).then(function (result) {
    if (!result.isConfirmed) return;
    contacts.splice(findIndex(id), 1);
    saveContacts();
    render();
    Swal.fire({ icon: "success", title: "Deleted!", text: "Contact has been deleted.", timer: 1500, showConfirmButton: false });
  });
}

// ===================== Favorite / Emergency toggles =====================
function toggleFlag(id, key) {
  var contact = contacts[findIndex(id)];
  if (!contact) return;
  contact[key] = !contact[key];
  saveContacts();
  render();
}

// ===================== Search =====================
searchInput.addEventListener("input", render);

function getFilteredContacts() {
  var term = searchInput.value.trim().toLowerCase();
  if (!term) return contacts;
  return contacts.filter(function (c) {
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });
}

// ===================== Render =====================
function contactCardHTML(c) {
  var id = c.id;
  var mailBtn = c.email
    ? '<a class="icon-btn mail" href="mailto:' + encodeURIComponent(c.email).replace(/%40/g, "@") + '" title="Send email"><i class="fa-solid fa-envelope"></i></a>'
    : '<span class="icon-btn mail disabled" title="No email"><i class="fa-solid fa-envelope"></i></span>';

  return (
    '<div class="col-12 col-md-6">' +
      '<div class="contact-card">' +
        '<div class="d-flex gap-3 align-items-center mb-2">' +
          avatarHTML(c) +
          '<div class="flex-grow-1 min-w-0">' +
            '<h6 class="contact-name">' + escapeHTML(c.name) + "</h6>" +
            '<div class="d-flex flex-wrap gap-1 mt-1">' +
              (c.group ? '<span class="badge badge-group">' + escapeHTML(c.group) + "</span>" : "") +
              (c.emergency ? '<span class="badge badge-emg">Emergency</span>' : "") +
            "</div>" +
          "</div>" +
        "</div>" +
        '<p class="contact-info"><i class="fa-solid fa-phone"></i> ' + escapeHTML(c.phone) + "</p>" +
        (c.email ? '<p class="contact-info"><i class="fa-solid fa-envelope"></i> ' + escapeHTML(c.email) + "</p>" : "") +
        (c.address ? '<p class="contact-info"><i class="fa-solid fa-location-dot"></i> ' + escapeHTML(c.address) + "</p>" : "") +
        (c.notes ? '<p class="contact-info"><i class="fa-solid fa-note-sticky"></i> ' + escapeHTML(c.notes) + "</p>" : "") +
        '<div class="card-actions">' +
          '<div class="d-flex gap-2">' +
            '<a class="icon-btn call" href="tel:' + encodeURIComponent(c.phone) + '" title="Call"><i class="fa-solid fa-phone"></i></a>' +
            mailBtn +
          "</div>" +
          '<div class="d-flex gap-2">' +
            '<button class="icon-btn fav ' + (c.favorite ? "active" : "") + '" onclick="toggleFlag(' + id + ', \'favorite\')" title="' + (c.favorite ? "Remove from favorites" : "Add to favorites") + '"><i class="fa-' + (c.favorite ? "solid" : "regular") + ' fa-star"></i></button>' +
            '<button class="icon-btn emg ' + (c.emergency ? "active" : "") + '" onclick="toggleFlag(' + id + ', \'emergency\')" title="' + (c.emergency ? "Remove from emergency" : "Mark as emergency") + '"><i class="fa-solid fa-heart-pulse"></i></button>' +
            '<button class="icon-btn edit" onclick="openEdit(' + id + ')" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="icon-btn delete" onclick="deleteContact(' + id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>"
  );
}

function sideItemHTML(c, removeKey) {
  return (
    "<li>" +
      avatarHTML(c) +
      '<div class="info"><p class="fw-semibold">' + escapeHTML(c.name) + '</p><p class="text-muted">' + escapeHTML(c.phone) + "</p></div>" +
      '<a class="icon-btn call" href="tel:' + encodeURIComponent(c.phone) + '" title="Call"><i class="fa-solid fa-phone"></i></a>' +
    "</li>"
  );
}

function emptyHTML(icon, text) {
  return '<div class="empty-state"><i class="fa-solid ' + icon + ' d-block"></i>' + text + "</div>";
}

function render() {
  var list = getFilteredContacts();
  var favs = contacts.filter(function (c) { return c.favorite; });
  var emgs = contacts.filter(function (c) { return c.emergency; });

  document.getElementById("totalCount").textContent = contacts.length;
  document.getElementById("favCount").textContent = favs.length;
  document.getElementById("emgCount").textContent = emgs.length;

  var contactsList = document.getElementById("contactsList");
  if (list.length) {
    contactsList.innerHTML = list.map(contactCardHTML).join("");
  } else {
    contactsList.innerHTML = '<div class="col-12">' + (contacts.length
      ? emptyHTML("fa-magnifying-glass", "No contacts match your search.")
      : emptyHTML("fa-address-book", "No contacts yet. Click <b>Add Contact</b> to get started.")) + "</div>";
  }

  document.getElementById("favList").innerHTML = favs.length
    ? favs.map(sideItemHTML).join("")
    : emptyHTML("fa-star", "Quick access");
  document.getElementById("emgList").innerHTML = emgs.length
    ? emgs.map(sideItemHTML).join("")
    : emptyHTML("fa-heart-pulse", "Urgent contacts");
}

render();
