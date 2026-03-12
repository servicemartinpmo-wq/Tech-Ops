import { useListStripeProducts, useGetSubscription, useCreateCheckoutSession, useCreatePortalSession } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Billing() {
  const { data: productsRes, isLoading: productsLoading } = useListStripeProducts();
  const { data: subRes, isLoading: subLoading } = useGetSubscription();
  const { mutate: checkout, isPending: isCheckingOut } = useCreateCheckoutSession();
  const { mutate: portal, isPending: isPortalLoading } = useCreatePortalSession();

  if (productsLoading || subLoading) return <div className="p-12 text-center">Loading...</div>;

  const currentTier = subRes?.tier || "free";
  const products = productsRes?.data || [];

  const handleSubscribe = (priceId: string) => {
    checkout({ data: { priceId } }, {
      onSuccess: (res) => {
        window.location.href = res.url;
      }
    });
  };

  const handleManage = () => {
    portal(undefined, {
      onSuccess: (res) => {
        window.location.href = res.url;
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-slate-900">Simple, Transparent Pricing</h1>
        <p className="text-slate-500 mt-3 text-lg">Scale your autonomous operations engine as your infrastructure grows.</p>
        
        {subRes?.subscription && (
          <div className="mt-6 inline-flex items-center gap-3 p-2 pr-4 bg-green-50 border border-green-200 rounded-full">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-green-800">Active Plan: <span className="font-bold capitalize">{currentTier}</span></span>
            <Button size="sm" variant="outline" className="ml-4 h-8 bg-white" onClick={handleManage} isLoading={isPortalLoading}>
              Manage Billing
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const price = product.prices[0];
          if (!price) return null;
          
          const isCurrent = product.name.toLowerCase().includes(currentTier.toLowerCase());
          const isPopular = product.name.toLowerCase().includes("business");

          return (
            <Card key={product.id} className={`p-6 relative flex flex-col ${isPopular ? 'border-primary ring-2 ring-primary/20 shadow-xl shadow-primary/10' : ''}`}>
              {isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-display font-bold text-slate-900">{product.name}</h3>
                <p className="text-sm text-slate-500 mt-1 min-h-[40px]">{product.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">{formatCurrency(price.unitAmount, price.currency)}</span>
                <span className="text-slate-500 font-medium">/mo</span>
              </div>

              <div className="mt-auto pt-6">
                {isCurrent ? (
                  <Button className="w-full bg-slate-100 text-slate-500 cursor-default hover:bg-slate-100 border-none shadow-none" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant={isPopular ? "primary" : "secondary"}
                    onClick={() => handleSubscribe(price.id)}
                    isLoading={isCheckingOut}
                  >
                    Subscribe Now
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      <div className="mt-16 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-slate-100 rounded-2xl text-slate-500">
          <CreditCard className="w-6 h-6 mr-3 text-slate-400" />
          <span className="font-medium text-sm">Secure payments powered by Stripe. Cancel anytime.</span>
        </div>
      </div>
    </div>
  );
}
