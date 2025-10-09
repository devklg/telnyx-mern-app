# DEVELOPMENT STORY: DANIEL LEE - USER MANAGEMENT
**BMAD v4 Voice Agent Learning System | Agent: Daniel Lee - Authentication & User Management**

## 🎯 **BUSINESS CONTEXT**
User authentication and management system for Voice Agent Learning System supporting Kevin and future multi-user expansion.

## 📋 **STORY OVERVIEW**
**As a** User Management Specialist  
**I want** complete authentication system with role-based access control  
**So that** the voice agent system can securely manage users and permissions

## 🏗️ **TECHNICAL REQUIREMENTS - USER MANAGEMENT**

### **Authentication Components**
```tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  
  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const { token, user } = await response.json();
        localStorage.setItem('token', token);
        window.location.href = '/dashboard';
      } else {
        const error = await response.json();
        form.setError('root', { message: error.message });
      }
    } catch (error) {
      form.setError('root', { message: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md magnificent-gradient-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl magnificent-text-gradient text-center">
            Magnificent Worldwide
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Voice Agent Learning System
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="kevin@magnificentworldwide.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.formState.errors.root && (
                <div className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="magnificent-gradient w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export function UserManagementDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  return (
    <div className="space-y-6">
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>User Management</span>
            <Button className="magnificent-gradient">
              Add New User
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable users={users} onSelectUser={setSelectedUser} />
        </CardContent>
      </Card>
      
      {selectedUser && (
        <UserDetailCard user={selectedUser} onUpdate={() => {/* refresh users */}} />
      )}
    </div>
  );
}
```

## 🔒 **Role-Based Access Control**

### **User Roles and Permissions**
```javascript
const userRoles = {
  kevin: {
    name: 'Kevin - Business Owner',
    permissions: [
      'dashboard.view',
      'calls.view',
      'calls.manage',
      'leads.view',
      'leads.manage',
      'transfers.receive',
      'analytics.view',
      'users.view',
      'settings.manage'
    ]
  },
  operator: {
    name: 'Call Operator',
    permissions: [
      'dashboard.view',
      'calls.view',
      'calls.initiate',
      'leads.view',
      'leads.update',
      'transfers.initiate'
    ]
  },
  analyst: {
    name: 'Performance Analyst',
    permissions: [
      'dashboard.view',
      'analytics.view',
      'analytics.export',
      'calls.view',
      'leads.view'
    ]
  },
  admin: {
    name: 'System Administrator',
    permissions: [
      'dashboard.view',
      'calls.view',
      'calls.manage',
      'leads.view',
      'leads.manage',
      'users.view',
      'users.manage',
      'settings.manage',
      'analytics.view',
      'system.manage'
    ]
  }
};
```

## 🏁 **DEFINITION OF DONE**

✅ Complete authentication system operational  
✅ Role-based access control implemented  
✅ User management interface functional  
✅ JWT token management secure  
✅ Permission-based route protection  
✅ Magnificent Worldwide branded login  
✅ Multi-user expansion ready  

---

**Agent:** Daniel Lee - User Management Specialist  
**Dependencies:** Marcus Thompson (Security), Michael Park (Frontend)  
**Estimated Effort:** 2-3 sprints  
**Priority:** MEDIUM (Foundation for multi-user expansion)  
**Technical Focus:** Authentication, authorization, user roles, JWT

---
**Created by:** BMAD Scrum Master  
**For:** Magnificent Worldwide Marketing & Sales Group  
**Project:** Voice Agent Learning System - User Management & Authentication  
**Story:** User Management - Complete authentication system with role-based access control