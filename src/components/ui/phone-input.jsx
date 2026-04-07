import * as React from "react"
import { cn } from "@/lib/utils"
import { formatPhoneNumber } from "@/lib/phoneUtils"

const PhoneInput = React.forwardRef(({ className, value, onChange, onBlur, ...props }, ref) => {
  const handleChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    e.target.value = formatted;
    if (onChange) onChange(e);
  };

  const handleKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(e.keyCode)) return;
    
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ([65, 67, 86, 88].includes(e.keyCode) && (e.ctrlKey || e.metaKey)) return;
    
    // Allow only numeric input
    if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <input
      type="tel"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onBlur}
      placeholder="(XXX) XXX-XXXX"
      {...props}
    />
  );
});
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }