const test = require("node:test");
const assert = require("node:assert/strict");

const addressesRouter = require("../routes/addresses");
const {
  normalizePhoneNumber,
  normalizeAddressPayload,
  validateAddressPayload,
} = addressesRouter.__testables;

test("normalizePhoneNumber keeps raw input for strict validation", () => {
  const normalizedPhoneNumber = normalizePhoneNumber("090-123 45(67)");
  assert.equal(normalizedPhoneNumber, "090-123 45(67)");
});

test("normalizeAddressPayload defaults empty label and keeps raw phoneNumber", () => {
  const normalizedPayload = normalizeAddressPayload({
    label: " ",
    recipientName: " Nguyen Van A ",
    phoneNumber: "090 123-4567",
    addressLine: " 123 Duong ABC ",
    isDefault: true,
  });

  assert.equal(normalizedPayload?.label, "Dia chi");
  assert.equal(normalizedPayload?.recipientName, "Nguyen Van A");
  assert.equal(normalizedPayload?.phoneNumber, "090 123-4567");
  assert.equal(normalizedPayload?.addressLine, "123 Duong ABC");
  assert.equal(normalizedPayload?.isDefault, true);
});

test("validateAddressPayload returns error when phoneNumber is empty", () => {
  const validateMessage = validateAddressPayload({
    addressLine: "123 Duong ABC",
    phoneNumber: "",
  });

  assert.equal(validateMessage, "So dien thoai khong duoc de trong");
});

test("validateAddressPayload returns error when phoneNumber is not exactly 10 digits", () => {
  const normalizedPayload = normalizeAddressPayload({
    addressLine: "123 Duong ABC",
    phoneNumber: "090-123-456",
  });

  const validateMessage = validateAddressPayload(normalizedPayload);
  assert.equal(
    validateMessage,
    "So dien thoai phai gom dung 10 chu so, vi du: 0869727139",
  );
});

test("validateAddressPayload rejects spaces and separators", () => {
  const normalizedPayload = normalizeAddressPayload({
    addressLine: "123 Duong ABC",
    phoneNumber: "090-123 4567",
  });

  const validateMessage = validateAddressPayload(normalizedPayload);
  assert.equal(
    validateMessage,
    "So dien thoai phai gom dung 10 chu so, vi du: 0869727139",
  );
});

test("validateAddressPayload accepts exact 10-digit phone number", () => {
  const normalizedPayload = normalizeAddressPayload({
    addressLine: "123 Duong ABC",
    phoneNumber: "0869727139",
  });

  const validateMessage = validateAddressPayload(normalizedPayload);
  assert.equal(validateMessage, "");
});
