const Confirm = async () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4 bg-[#1e1e1e] text-foreground"> {/* Ganti bg & text color */}
            <h1 className="text-4xl font-bold mb-4 text-foreground">
                Sign <span className="text-secondary">Up</span>
            </h1>
            <p className="text-xl font-semibold mb-2 text-foreground">
                We&apos;ve Sent You a Sign Up Confirmation In Your Email
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
                Please check your email inbox (and spam folder) for the confirmation link. You will be able to log in once the email is confirmed
            </p>
        </div>
    );
}

export default Confirm;