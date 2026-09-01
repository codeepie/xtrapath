// ambient type definitions for Deno runtime and URL imports
// used by the TypeScript Language Server in IDE / VS Code

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    has(key: string): boolean;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }
  export const env: Env;
}

declare module "https://*" {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
  export const Stripe: any;
}

declare namespace Stripe {
  interface Subscription {
    id: string;
    customer: string | any;
    status: string;
    items: {
      data: Array<{
        price: {
          id: string;
          recurring?: {
            interval?: string;
          };
        };
      }>;
    };
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end?: boolean;
    [key: string]: any;
  }

  interface Customer {
    id: string;
    email?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  }

  interface PaymentIntent {
    id: string;
    status: string;
    [key: string]: any;
  }

  interface Invoice {
    id: string;
    customer: string;
    [key: string]: any;
  }

  namespace Checkout {
    namespace SessionCreateParams {
      type Mode = "payment" | "setup" | "subscription";
    }
    interface SessionCreateParams {
      customer?: string;
      payment_method_types?: string[];
      line_items?: any[];
      mode?: Mode;
      success_url?: string;
      cancel_url?: string;
      metadata?: Record<string, any>;
      allow_promotion_codes?: boolean;
      [key: string]: any;
    }
    interface Session {
      id: string;
      url?: string | null;
      mode?: string;
      metadata?: Record<string, any>;
      subscription?: string | any;
      [key: string]: any;
    }
  }

  namespace BillingPortal {
    interface Sessions {
      create(params: { customer: string; return_url?: string }): Promise<{ url: string; [key: string]: any }>;
    }
  }

  interface Event {
    type: string;
    data: {
      object: any;
    };
    [key: string]: any;
  }
}
