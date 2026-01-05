"use client";

import Link from "next/link";
import Image from "next/image";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/price";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react";

interface ItemsProps {
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
  };
  quantity: number;
}

export const CartDrawer = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const items: ItemsProps[] = [];
  const totalItems = 0;
  const totalPrice = 0;

  const CartContent = () => {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="size-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <ShoppingBagIcon className="size-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Discover our premium organic products and add them to your cart
              </p>
              <Button asChild onClick={() => {}} className="w-full max-w-xs">
                <Link href="/products" prefetch>
                  Browse Products
                </Link>
              </Button>
            </div>
          ) : (
            <div className="p-4">
              {items.map((item, index) => (
                <div
                  key={item.product.id}
                  className={cn(
                    "flex gap-4 p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-all duration-200",
                    index !== items.length - 1 && "mb-3"
                  )}
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border/20">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover transition-all"
                      priority
                      sizes="80px"
                    />
                  </div>

                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="space-y-1">
                      <h4 className="font-semibold line-clamp-2 text-sm leading-tight">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center justify-between">
                        <Price price={item.product.price} size="sm" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Subtotal:{" "}
                          <Price
                            price={item.product.price * item.quantity}
                            size="sm"
                            className="font-medium"
                          />
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          className="size-8 cursor-pointer transition-all duration-200 hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive"
                          variant="outline"
                          size="icon"
                          onClick={() => {}}
                        >
                          <MinusIcon className="size-3" />
                        </Button>

                        <span className="w-10 text-center text-sm font-semibold bg-muted/50 py-1 px-2 rounded transition-all duration-200">
                          {item.quantity}
                        </span>

                        <Button
                          className="size-8 cursor-pointer transition-all duration-200 hover:bg-primary/20 hover:border-primary/40 hover:text-primary"
                          variant="outline"
                          size="icon"
                          onClick={() => {}}
                        >
                          <PlusIcon className="size-3" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/20 transition-all duration-200"
                        onClick={() => {}}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t bg-background/50 backdrop-blur-sm p-4 space-y-4 transition-all duration-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="transition-all duration-200">
                  Items ({totalItems})
                </span>
                <div className="transition-all duration-200">
                  <Price
                    price={totalPrice}
                    size="lg"
                    className="text-primary"
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full cursor-pointer transition-all duration-200"
              size="lg"
              onClick={() => {}}
            >
              Proceed to Checkout
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Cash on delivery available • Free shipping across Bangladesh
            </p>
          </div>
        )}
      </div>
    );
  };

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative hover:bg-accent cursor-pointer"
    >
      <ShoppingBagIcon className="h-5 w-5 cursor-pointer" />
      <Badge
        variant="destructive"
        className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-xs font-semibold text-white flex items-center justify-center min-w-4 min-h-4"
      >
        {totalItems || 0}
      </Badge>
    </Button>
  );

  // Desktop: Use Sheet (side drawer)
  if (isDesktop) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-left">
              Shopping Cart {totalItems > 0 && `(${totalItems})`}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CartContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Mobile: Use Drawer (bottom sheet)
  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="text-center">
            Shopping Cart {totalItems > 0 && `(${totalItems})`}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden">
          <CartContent />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
