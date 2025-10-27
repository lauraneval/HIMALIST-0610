import React from "react";

const AuthButton = ({
  type,
  loading,
}: {
  type: "Login" | "Sign Up" | "Reset Password" | "Forgot Password";
  loading: boolean;
}) => {
  return (
    <button
      disabled={loading}
      type="submit"
      className={`${
        loading ? "bg-gray-600" : "bg-secondary"
      } rounded-md w-full px-12 py-3 text-sl font-medium text-white cursor-pointer hover:bg-secondary-hover`}
    >
      {loading ? "Loading..." : type}
    </button>
  );
};

export default AuthButton;
