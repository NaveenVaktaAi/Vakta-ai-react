import { useState, useEffect } from 'react';
import { Check, Zap, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Plan {
  plan_id: string;
  name: string;
  price: number;
  token_limit: number;
  duration_days: number | null;
  features: string[];
}

const Pricing = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>('free_trial');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
    loadCurrentSubscription();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/payment/plans');
      if (response.data.success) {
        setPlans(response.data.data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const response = await api.get('/payment/subscription');
      if (response.data.success && response.data.data) {
        setCurrentPlan(response.data.data.plan_id);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  // Check if trial is expired
  const isTrialExpired = user?.account_status === 'expired';

  const handlePurchase = async (planId: string) => {
    if (planId === 'free_trial') {
      return; // Free trial is already active
    }

    try {
      setProcessing(planId);
      
      // Create Razorpay order
      const orderResponse = await api.post('/payment/create-order', {
        plan_id: planId
      });

      if (!orderResponse.data.success) {
        throw new Error('Failed to create order');
      }

      const orderData = orderResponse.data.data;

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount * 100, // Convert to paise
          currency: orderData.currency,
          name: 'Vakta AI',
          description: `Purchase ${planId} plan`,
          order_id: orderData.order_id,
          handler: async function (response: any) {
            try {
              // Verify payment
              const verifyResponse = await api.post('/payment/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyResponse.data.success) {
                alert('Payment successful! Your subscription has been activated.');
                // Refresh user data to get updated account_status
                if (refreshUser) {
                  await refreshUser();
                }
                loadCurrentSubscription();
                navigate('/dashboard');
              } else {
                alert('Payment verification failed. Please contact support.');
              }
            } catch (error: any) {
              console.error('Payment verification error:', error);
              alert(error.response?.data?.detail || 'Payment verification failed. Please contact support.');
            } finally {
              setProcessing(null);
            }
          },
          prefill: {
            name: user?.full_name || '',
            email: user?.email || '',
            contact: user?.phone_number || ''
          },
          theme: {
            color: '#3b82f6'
          },
          modal: {
            ondismiss: function() {
              setProcessing(null);
            }
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      };
      document.body.appendChild(script);
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      alert(error.response?.data?.detail || 'Failed to initiate payment. Please try again.');
      setProcessing(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free_trial':
        return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />;
      case 'basic':
        return <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />;
      case 'premium':
        return <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />;
      default:
        return <Check className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free_trial':
        return 'border-gray-300 bg-white';
      case 'basic':
        return 'border-blue-500 bg-blue-50';
      case 'premium':
        return 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50';
      default:
        return 'border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 px-2">
            Choose Your Plan
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 px-4">
            Unlock unlimited learning with our flexible pricing plans
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.plan_id;
            const isProcessing = processing === plan.plan_id;
            
            return (
              <div
                key={plan.plan_id}
                className={`relative rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 md:p-8 ${getPlanColor(plan.plan_id)} ${
                  plan.plan_id === 'premium' ? 'lg:scale-105' : ''
                } transition-all hover:shadow-2xl`}
              >
                {plan.plan_id === 'premium' && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white mb-3 sm:mb-4">
                    {getPlanIcon(plan.plan_id)}
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-3 sm:mb-4">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">₹{plan.price}</span>
                    {plan.duration_days && (
                      <span className="text-sm sm:text-base md:text-lg text-gray-600">/{plan.duration_days} days</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-3">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5 sm:mt-1" />
                      <span className="text-sm sm:text-base text-gray-700 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {plan.plan_id === 'free_trial' && isTrialExpired ? (
                  <div className="w-full py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg bg-gray-300 text-gray-600 cursor-not-allowed text-center">
                    Trial Expired
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchase(plan.plan_id)}
                    disabled={isCurrentPlan || isProcessing}
                    className={`w-full py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all ${
                      isCurrentPlan
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : plan.plan_id === 'premium'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 active:scale-95'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : isProcessing
                      ? 'Processing...'
                      : plan.price === 0
                      ? 'Get Started'
                      : 'Purchase Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-8 sm:mt-10 md:mt-12 text-center px-4">
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-2 sm:mb-3 md:mb-4">
            All plans include access to DocSathi and AI Tutor
          </p>
          <p className="text-xs sm:text-sm md:text-base text-gray-500">
            Tokens are shared across all services. Upgrade anytime to get more tokens.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

