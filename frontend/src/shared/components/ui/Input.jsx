import React from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * @typedef {Object} CustomInputProps
 * @property {string} [label]
 * @property {string} [error]
 * @property {string} [helperText]
 * @property {any} [icon]
 * @property {string} [className]
 */

/** @type {React.ForwardRefExoticComponent<CustomInputProps & React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>} */
const Input = React.forwardRef(({ label, error, helperText, className, icon, ...props }, ref) => {
    return (
        <div className="w-full space-y-1">
            {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
            <ShadcnInput
                className={cn(
                    error && 'border-destructive focus-visible:ring-destructive',
                    className
                )}
                ref={ref}
                {...props}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;

