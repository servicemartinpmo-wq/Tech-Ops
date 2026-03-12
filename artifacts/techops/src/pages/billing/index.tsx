import { useListStripeProducts, useGetSubscription, useCreateCheckoutSession, useCreatePortalSession } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Billing() {
  const { data: productsRes, isLoading: productsLoading } = useListStripeProducts();
  const { data: subRes, isLoading: subLoading } = useGetSubscription();
  const { mutate: checkout, isPending: isCheckingOut } = useCreateCheckoutSession();
  const { mutate: portal, isPending: isPortalLoading } = useCreatePortalSession();

  if (productsLoading || subLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;

  const currentTier = subRes?.tier || "free";
  const products = productsRes?.data || [];

  const handleSubscribe = (priceId: string) => {
    checkout({ data: { priceId } }, {
      onSuccess: (res) => { window.location.href = res.url; }
    });
  };

  const handleManage = () => {
    portal(undefined, {
      onSuccess: (res) => { window.location.href = res.url; }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-white text-glow">Simple, Transparent Pricing</h1>
        <p className="text-slate-500 mt-3 text-lg">Scale your autonomous operations engine as your infrastructure grows.</p>
        
        {subRes?.subscription && (
          <div className="mt-6 inline-flex items-center gap-3 p-2 pr-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-emerald-400">Active Plan: <span className="font-bold capitalize">{currentTier}</span></span>
            <Button size="sm" variant="outline" className="ml-4 h-8" onClick={handleManage} isLoading={isPortalLoading}>
              Manage Billing
            </Button>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product, i) => {
          const price = product.prices[0];
          if (!price) return null;
          
          const isCurrent = product.name.toLowerCase().includes(currentTier.toLowerCase());
          const isPopular = product.name.toLowerCase().includes("business");

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`p-6 relative flex flex-col ${isPopular ? 'neon-border shadow-xl shadow-cyan-500/10' : ''}`}>
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-showroom-dark px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-display font-bold text-white">{product.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 min-h-[40px]">{product.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{formatCurrency(price.unitAmount, price.currency)}</span>
                  <span className="text-slate-500 font-medium">/mo</span>
                </div>

                <div className="mt-auto pt-6">
                  {isCurrent ? (
                    <Button className="w-full bg-white/5 text-slate-500 cursor-default hover:bg-white/5 border-white/[0.06] shadow-none" disabled>
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
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-16 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-white/[0.03] rounded-2xl text-slate-500 border border-white/[0.06]">
          <CreditCard className="w-6 h-6 mr-3 text-slate-600" />
          <span className="font-medium text-sm">Secure payments powered by Stripe. Cancel anytime.</span>
        </div>
      </div>
    </div>
  );
}
