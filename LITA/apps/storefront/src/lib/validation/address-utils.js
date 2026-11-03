const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function normalizeIndianPhone(value) {
  let phone = value.trim().replace(/[\s()-]/g, "");
  if (phone.startsWith("+91")) phone = phone.slice(3);
  if (phone.startsWith("0")) phone = phone.slice(1);
  return phone;
}

function isValidIndianPhone(value) {
  return /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));
}

function isValidIndianPincode(value) {
  return /^[1-9]\d{5}$/.test(value.trim());
}

function splitFullName(value) {
  const [first_name = "", ...lastName] = value.trim().split(/\s+/).filter(Boolean);
  return { first_name, last_name: lastName.join(" ") };
}

function hasFirstAndLastName(value) {
  const { first_name, last_name } = splitFullName(value);
  return Boolean(first_name && last_name);
}

module.exports = {
  INDIAN_STATES,
  hasFirstAndLastName,
  isValidIndianPhone,
  isValidIndianPincode,
  normalizeIndianPhone,
  splitFullName,
};
