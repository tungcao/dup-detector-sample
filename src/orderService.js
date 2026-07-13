// Case 2: cùng logic nghiệp vụ (validate email) nhưng viết theo cấu trúc hoàn toàn khác
export function checkEmailFormat(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }
  const atIndex = input.indexOf('@');
  const dotIndex = input.lastIndexOf('.');
  if (atIndex < 1) {
    return false;
  }
  if (dotIndex < atIndex + 2) {
    return false;
  }
  return true;
}

// Cùng nghiệp vụ tính giá sau giảm giá, nhưng viết theo style loop/khác biến hoàn toàn
export function applyDiscountToPrice(originalPrice, discountPercent) {
  let finalPrice = originalPrice;
  if (originalPrice > 0) {
    const cut = (discountPercent / 100) * originalPrice;
    finalPrice = originalPrice - cut;
  } else {
    finalPrice = 0;
  }
  return finalPrice;
}

// Hàm hoàn toàn khác biệt, không duplicate với ai — dùng để kiểm chứng false-positive
export function generateOrderId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}
