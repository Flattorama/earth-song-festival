import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-4">
          You're In!
        </h1>
        <p className="text-foreground/80 text-lg mb-8">
          Your ticket for the Earth Song Festival Retreat has been secured. 
          Check your email for confirmation details.
        </p>
        <Link to="/">
          <Button className="bg-primary text-primary-foreground h-12 px-8 rounded-lg">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
