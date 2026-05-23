// Simple request validation middleware
// Validates required fields and types in req.body

export function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: rules.message || `${field} 为必填项` });
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.type === 'array' && !Array.isArray(value)) {
          errors.push({ field, message: `${field} 必须为数组` });
        }
        if (rules.type === 'number' && isNaN(Number(value))) {
          errors.push({ field, message: `${field} 必须为数字` });
        }
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push({ field, message: `${field} 必须为字符串` });
        }
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push({ field, message: `${field} 长度不能少于 ${rules.minLength}`});
        }
        if (rules.min !== undefined && Number(value) < rules.min) {
          errors.push({ field, message: `${field} 不能小于 ${rules.min}`});
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0].message, errors });
    }
    next();
  };
}