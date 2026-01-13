"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, X } from "lucide-react"
import { useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

const trainerFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  expertise: z
    .array(z.string())
    .min(1, "At least one expertise is required")
    .refine(
      (items) => {
        const nonEmpty = items.filter((item) => item.trim().length > 0)
        return nonEmpty.length > 0
      },
      "At least one expertise must be filled"
    ),
  description: z.string().optional(),
  profilePicture: z
    .instanceof(File, { message: "Please upload a valid image file" })
    .optional()
    .refine(
      (file) => !file || file.type.startsWith("image/"),
      "File must be an image"
    ),
})

type TrainerFormValues = z.infer<typeof trainerFormSchema>

export function CreateTrainerForm() {
  const { user } = useUser()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createTrainer = useMutation(api.trainers.create)
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const upsertUser = useMutation(api.users.upsertFromClerk)

  const form = useForm<TrainerFormValues>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      expertise: [""],
      description: "",
      profilePicture: undefined,
    },
  })

  const expertise = form.watch("expertise")

  const addExpertise = () => {
    form.setValue("expertise", [...expertise, ""])
  }

  const removeExpertise = (index: number) => {
    if (expertise.length > 1) {
      form.setValue(
        "expertise",
        expertise.filter((_, i) => i !== index)
      )
    }
  }

  const onSubmit = async (data: TrainerFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to create a trainer",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Filter out empty expertise strings
      const filteredExpertise = data.expertise.filter((exp) => exp.trim().length > 0)

      // Ensure user exists in Convex
      let userId: Id<"users"> | undefined
      if (user.id) {
        userId = await upsertUser({
          clerkUserId: user.id,
          name: user.fullName || undefined,
          email: user.primaryEmailAddress?.emailAddress || undefined,
          image: user.imageUrl || undefined,
        })
      }

      // Upload image if provided
      let profilePictureStorageId: string | undefined
      if (data.profilePicture) {
        try {
          const uploadUrl = await generateUploadUrl()
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": data.profilePicture.type },
            body: data.profilePicture,
          })
          const { storageId } = await result.json()
          profilePictureStorageId = storageId as any
        } catch (error) {
          console.error("Error uploading image:", error)
          toast({
            variant: "destructive",
            title: "Image Upload Error",
            description: "Failed to upload profile picture. Trainer will be created without image.",
          })
        }
      }

      // Create trainer
      await createTrainer({
        name: data.name,
        email: data.email,
        phone: data.phone,
        expertise: filteredExpertise,
        description: data.description || undefined,
        profilePicture: profilePictureStorageId,
        createdBy: userId,
      })

      toast({
        variant: "success",
        title: "Success",
        description: "Trainer created successfully!",
      })

      form.reset()
    } catch (error) {
      console.error("Error creating trainer:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trainer. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Trainer</CardTitle>
        <CardDescription>
          Add a new trainer to the system with their details and expertise
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter trainer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Expertise</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExpertise}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {expertise.map((_, index) => (
                  <FormField
                    key={index}
                    control={form.control}
                    name={`expertise.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter expertise"
                              {...field}
                              className="flex-1"
                            />
                            {expertise.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeExpertise(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter trainer description/bio"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description about the trainer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <Input
                      {...fieldProps}
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          onChange(file)
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a profile picture for the trainer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Trainer"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
