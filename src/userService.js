// Case 1: gần như copy-paste, chỉ đổi tên hàm và tên biến
export function formatUserName(user) {
  if (!user) return '';
  const first = user.firstName ? user.firstName.trim() : '';
  const last = user.lastName ? user.lastName.trim() : '';
  return `${first} ${last}`.trim();
}

export function buildFullName(profile) {
  if (!profile) return '';
  const fn = profile.firstName ? profile.firstName.trim() : '';
  const ln = profile.lastName ? profile.lastName.trim() : '';
  return `${fn} ${ln}`.trim();
}

// Hàm validate email, sẽ có bản duplicate ở file khác với logic viết khác cấu trúc
export function isValidEmail(email) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function calculateDiscount(price, percent) {
  if (price <= 0) return 0;
  const discount = price * (percent / 100);
  return price - discount;
}

export function getUserDisplayName(u) {
  if (!u) return '';
  const f = u.firstName ? u.firstName.trim() : '';
  const l = u.lastName ? u.lastName.trim() : '';
  return `${f} ${l}`.trim();
}
