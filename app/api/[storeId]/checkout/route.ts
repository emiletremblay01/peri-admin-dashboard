import Stripe from "stripe";
import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import prismadb from "@/lib/prismadb";
import { Product } from "@prisma/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  const { productIds }: { productIds: string[] } = await req.json();

  if (!productIds || productIds.length === 0) {
    return new NextResponse("Missing productIds", {
      status: 400,
    });
  }

  const products = await prismadb.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
  });

  const productsReal: (Product | undefined)[] = productIds.map((productId) =>
    products.find((product) => product.id === productId)
  );

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  productsReal.forEach((product) => {
    if (product) {
      line_items.push({
        price_data: {
          currency: "cad",
          product_data: {
            name: product.name,
          },
          unit_amount: product.price.toNumber() * 100,
        },
        quantity: 1,
      });
    }
  });

  const order = await prismadb.order.create({
    data: {
      storeId: params.storeId,
      isPaid: false,
      orderItems: {
        create: productsReal.map((product) => ({
          product: {
            connect: {
              id: product?.id,
            },
          },
        })),
      },
    },
  });

  const session = await stripe.checkout.sessions.create({
    line_items,
    mode: "payment",
    billing_address_collection: "required",
    phone_number_collection: {
      enabled: true,
    },
    success_url: `${process.env.FRONTEND_STORE_URL}/cart?success=1`,
    cancel_url: `${process.env.FRONTEND_STORE_URL}/cart?canceled=1`,
    metadata: {
      orderId: order.id,
    },
  });

  return NextResponse.json({ url: session.url }, { headers: corsHeaders });
}
