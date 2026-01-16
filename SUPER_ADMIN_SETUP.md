# Super Admin Setup Guide

## How to Manually Set a User as Super Admin

### Step 1: User Must Be Logged In First
The user must sign up/login at least once so their account is created in the Convex database.

### Step 2: Find User in Convex Dashboard

1. Go to your **Convex Dashboard**: https://dashboard.convex.dev
2. Select your project
3. Navigate to **Data** → **Tables** → **users**

### Step 3: Locate the User

1. Find the user by their email address
2. Click on the user record to view/edit it

### Step 4: Update Role Field

1. Find the `role` field in the user record
2. Change the value from `"user"` (or empty) to `"super_admin"`
3. Click **Save** or **Update**

### Step 5: Verify

1. The user should log out and log back in
2. Click on their profile picture in the navbar
3. They should now see **"Admin Panel"** option in the dropdown menu
4. Clicking it should take them to `/super-admin`

## Menu Structure

The custom user menu shows:
- **Email**: User's email address (display only)
- **Admin Panel**: Only visible if `role === "super_admin"` (links to `/super-admin`)
- **Log out**: Signs out the user

## Security Notes

- Role is stored in Convex database, not in Clerk
- UI checks are for UX only - all backend mutations verify role
- Only super admins can access `/super-admin` routes
- Always verify role in Convex mutations/queries

## Troubleshooting

**Admin Panel not showing?**
- Check that `role` field is exactly `"super_admin"` (case-sensitive)
- User must log out and log back in after role change
- Check browser console for any errors

**User not found in database?**
- User must sign up/login at least once to create the record
- Check that `clerkUserId` matches the Clerk user ID
