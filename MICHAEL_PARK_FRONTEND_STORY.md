# DEVELOPMENT STORY: MICHAEL PARK - FRONTEND FOUNDATION
**BMAD v4 Voice Agent Learning System | Agent: Michael Park - React & shadcn/ui Lead**

## 🎯 **BUSINESS CONTEXT**
React frontend foundation with shadcn/ui component library and Magnificent Worldwide branding for Voice Agent Learning System.

## 📋 **STORY OVERVIEW**
**As a** Frontend Foundation Developer  
**I want** complete React application with shadcn/ui and Magnificent Worldwide theming  
**So that** the voice agent system has a professional, branded user interface

## 🏗️ **TECHNICAL REQUIREMENTS - REACT + SHADCN/UI**

### **React Application Setup**
```bash
# Create React app with TypeScript
npx create-react-app voice-agent-frontend --template typescript
cd voice-agent-frontend

# Install shadcn/ui and dependencies
npx shadcn-ui@latest init
npm install @radix-ui/react-icons lucide-react
npm install socket.io-client axios
npm install @tanstack/react-query
npm install react-router-dom
```

### **Magnificent Worldwide Theme Configuration**
```css
/* globals.css - Magnificent Worldwide brand variables */
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

@layer base {
  :root {
    /* Magnificent Worldwide Brand Colors */
    --magnificent-primary: 59 130 246; /* #3b82f6 - Blue */
    --magnificent-secondary: 250 204 21; /* #facc15 - Gold */
    --magnificent-dark: 15 23 42; /* #0f172a - Dark Navy */
    
    /* shadcn/ui variable overrides */
    --background: var(--magnificent-dark);
    --foreground: 248 250 252; /* slate-50 */
    --card: 30 41 59; /* slate-800 */
    --card-foreground: 248 250 252;
    --popover: 30 41 59;
    --popover-foreground: 248 250 252;
    --primary: var(--magnificent-primary);
    --primary-foreground: 248 250 252;
    --secondary: var(--magnificent-secondary);
    --secondary-foreground: 15 23 42;
    --muted: 51 65 85; /* slate-600 */
    --muted-foreground: 148 163 184; /* slate-400 */
    --accent: 51 65 85;
    --accent-foreground: 248 250 252;
    --destructive: 239 68 68; /* red-500 */
    --destructive-foreground: 248 250 252;
    --border: 51 65 85;
    --input: 30 41 59;
    --ring: var(--magnificent-primary);
  }
}

/* Custom Magnificent Worldwide classes */
.magnificent-gradient {
  background: linear-gradient(135deg, 
    hsl(var(--magnificent-primary)) 0%, 
    hsl(var(--magnificent-secondary)) 100%);
}

.magnificent-gradient-border {
  border: 1px solid transparent;
  background: 
    linear-gradient(hsl(var(--background)), hsl(var(--background))) padding-box,
    linear-gradient(135deg, hsl(var(--magnificent-primary)), hsl(var(--magnificent-secondary))) border-box;
}

.magnificent-text-gradient {
  background: linear-gradient(135deg, 
    hsl(var(--magnificent-primary)) 0%, 
    hsl(var(--magnificent-secondary)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.magnificent-glow {
  box-shadow: 0 0 20px hsla(var(--magnificent-primary), 0.3);
}
```

### **Component Library Structure**
```typescript
// src/components/ui/ - shadcn/ui components
// src/components/magnificent/ - Custom branded components
// src/components/voice-agent/ - Voice agent specific components
// src/components/dashboard/ - Dashboard and analytics
// src/components/layout/ - Layout and navigation

// Custom Magnificent Worldwide Button Component
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const magnificentButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "magnificent-gradient text-primary-foreground hover:magnificent-glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "magnificent-gradient-border bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        magnificent: "magnificent-gradient text-white hover:magnificent-glow transform hover:scale-105 transition-all duration-200"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface MagnificentButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof magnificentButtonVariants> {
  asChild?: boolean
}

const MagnificentButton = React.forwardRef<HTMLButtonElement, MagnificentButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(magnificentButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
MagnificentButton.displayName = "MagnificentButton"

export { MagnificentButton, magnificentButtonVariants }
```

### **Layout and Navigation**
```tsx
// Main application layout with Magnificent Worldwide branding
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <Sidebar className="w-64 border-r magnificent-gradient-border" />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Header className="border-b magnificent-gradient-border" />
        
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

// Magnificent Worldwide Header Component
export function Header({ className }: { className?: string }) {
  return (
    <header className={cn("bg-card px-6 py-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold magnificent-text-gradient">
            Magnificent Worldwide
          </h1>
          <span className="text-muted-foreground">Voice Agent System</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge className="magnificent-gradient">
            Beast Mode Progress: 47%
          </Badge>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
```

## 🎨 **SHADCN/UI COMPONENT SHOWCASE**

### **Voice Agent Control Panel**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Phone, Users, BarChart3 } from "lucide-react"

export function VoiceAgentControlPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-magnificent-primary" />
            <span>Active Calls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold magnificent-text-gradient mb-2">
            12
          </div>
          <p className="text-muted-foreground text-sm">
            Currently in progress
          </p>
          <Button className="magnificent-gradient w-full mt-4">
            Start New Call
          </Button>
        </CardContent>
      </Card>
      
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-magnificent-secondary" />
            <span>Hot Transfers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold magnificent-text-gradient mb-2">
            8
          </div>
          <p className="text-muted-foreground text-sm">
            Successful today
          </p>
          <div className="flex items-center space-x-2 mt-4">
            <Badge variant="secondary">Kevin Available</Badge>
          </div>
        </CardContent>
      </Card>
      
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-magnificent-primary" />
            <span>Beast Mode Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Learning Progress</span>
              <span>47%</span>
            </div>
            <Progress value={47} className="magnificent-gradient" />
            <p className="text-muted-foreground text-xs">
              +3% this week
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🏁 **DEFINITION OF DONE**

✅ React application with TypeScript foundation operational  
✅ shadcn/ui component library fully integrated  
✅ Magnificent Worldwide theming and branding complete  
✅ Custom component library with brand variants ready  
✅ Responsive layout and navigation implemented  
✅ Socket.io client integration prepared  
✅ Performance optimized for real-time updates  

---

**Agent:** Michael Park - Frontend Foundation Developer  
**Dependencies:** None (Foundation component)  
**Estimated Effort:** 3-4 sprints  
**Priority:** HIGH (Frontend foundation for all UI components)  
**Technical Focus:** React, TypeScript, shadcn/ui, Magnificent Worldwide branding

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - React Frontend Foundation  
**Story:** Frontend Foundation - React + shadcn/ui with Magnificent Worldwide theming