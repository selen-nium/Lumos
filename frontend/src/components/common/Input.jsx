import React from 'react';

const Input = ({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
}) => {
  return (
    <div className="mb-1">
      <input
        type={type}
        name={name}
        id={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`form-input ${error ? 'border-error' : ''}`}
      />
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
};

export default Input;