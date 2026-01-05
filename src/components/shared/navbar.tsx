"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartDrawer } from "@/components/cart/cart-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BRAND_NAME, NAVIGATION_ITEMS } from "@/lib/constants";

const displayUser = {
  role: "USER",
  name: "John Doe",
  email: "john@example.com",
};

export const Navbar = () => {
  const pathname = usePathname();
  const isAuthenticated = false;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search:", searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 lg:gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 shrink-0"
            prefetch
          >
            <div className="flex items-center space-x-2">
              <Image
                src="/logo.png"
                width={20}
                height={20}
                alt={BRAND_NAME}
                className="size-8"
              />
            </div>
            <span className="hidden sm:inline-block font-serif text-xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {BRAND_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {NAVIGATION_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative",
                  pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
                )}
                prefetch
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar - Desktop & Tablet */}
          <div className="hidden md:flex items-center flex-1 max-w-sm lg:max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch(e);
                  }
                }}
                className="pl-10 h-10 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Wishlist - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-primary/10 hidden sm:flex cursor-pointer"
            >
              <Heart className="size-5" />
              <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] font-semibold flex items-center justify-center">
                0
              </Badge>
            </Button>

            {/* Cart */}
            <CartDrawer />

            {/* Theme Toggle - Desktop only */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Theme Toggle - Tablet */}
            <div className="hidden md:block lg:hidden">
              <ThemeToggle />
            </div>

            {/* User Menu - Desktop */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="cursor-pointer">
                  {isAuthenticated ? (
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full hover:bg-primary/10"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatar.png" alt={displayUser.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                          {displayUser.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-primary/10"
                    >
                      <User className="size-5" />
                    </Button>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 shadow-lg border-border/50 bg-background/95 backdrop-blur-sm"
                >
                  {isAuthenticated ? (
                    <>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1 px-1 py-1">
                          <p className="text-sm font-medium leading-none text-foreground">
                            {displayUser.name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {displayUser.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {displayUser.role === "ADMIN" && (
                        <DropdownMenuItem className="cursor-pointer">
                          <Shield className="mr-2 size-4" />
                          <span>Admin Dashboard</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 size-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/orders" className="cursor-pointer">
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          <span>My Orders</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => console.log("Logout")}
                        className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/20"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/login" className="cursor-pointer">
                          <LogIn className="mr-2 size-4" />
                          <span>Login / Register</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  {mobileMenuOpen ? (
                    <X className="size-5" />
                  ) : (
                    <Menu className="size-5" />
                  )}
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 overflow-y-auto"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between p-6 border-b">
                    <Link
                      href="/"
                      className="flex items-center space-x-2 shrink-0"
                      prefetch
                    >
                      <div className="flex items-center space-x-2">
                        <Image
                          src="/logo.png"
                          width={20}
                          height={20}
                          alt={BRAND_NAME}
                          className="size-8"
                        />
                      </div>
                      <span className="font-serif text-xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {BRAND_NAME}
                      </span>
                    </Link>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* Mobile Search */}
                    <div className="p-6 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          type="search"
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearch(e);
                            }
                          }}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    {/* User Profile Section - Mobile */}
                    {isAuthenticated && (
                      <div className="p-6 border-b bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                            <AvatarImage
                              src="/avatar.png"
                              alt={displayUser.name}
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground text-base">
                              {displayUser.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {displayUser.name}
                            </p>
                            <p className="text-xs truncate text-muted-foreground">
                              {displayUser.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mobile Navigation Links */}
                    <nav className="p-4 space-y-1">
                      {NAVIGATION_ITEMS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-200",
                            pathname === item.href
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </nav>

                    {/* Mobile User Actions */}
                    <div className="p-4 space-y-1 border-t">
                      {isAuthenticated ? (
                        <>
                          {displayUser.role === "ADMIN" && (
                            <button
                              onClick={() => {
                                setMobileMenuOpen(false);
                                console.log("Navigate to admin");
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-primary/10 text-left"
                            >
                              <Shield className="mr-3 h-5 w-5 text-muted-foreground" />
                              Admin Dashboard
                            </button>
                          )}

                          <Link
                            href="/profile"
                            className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-primary/10"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <User className="mr-3 h-5 w-5 text-muted-foreground" />
                            Profile
                          </Link>
                          <Link
                            href="/orders"
                            className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-primary/10"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <ShoppingBag className="mr-3 h-5 w-5 text-muted-foreground" />
                            My Orders
                          </Link>
                          <Link
                            href="/settings"
                            className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-primary/10"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                            Settings
                          </Link>
                          <Link
                            href="/wishlist"
                            className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-primary/10"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Heart className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Wishlist</span>
                            <Badge className="ml-auto h-5 px-2 text-xs">
                              0
                            </Badge>
                          </Link>
                        </>
                      ) : (
                        <Link
                          href="/login"
                          className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-primary/10"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <LogIn className="mr-3 h-5 w-5 text-muted-foreground" />
                          Login / Register
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Mobile Footer */}
                  <div className="p-6 border-t bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Theme
                      </span>
                      <ThemeToggle />
                    </div>

                    {isAuthenticated && (
                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          console.log("Logout");
                        }}
                        variant="outline"
                        className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-950 dark:hover:bg-red-950/20"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
