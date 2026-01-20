"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const trainerFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  expertise: z
    .array(z.string())
    .min(1, "At least one expertise is required")
    .refine(
      (items) => items.filter((i) => i.trim().length > 0).length > 0,
      "At least one expertise must be filled"
    ),
  description: z.string().optional(),
  profilePicture: z
    .instanceof(File, { message: "Please upload a valid image file" })
    .optional()
    .refine((file) => !file || file.type.startsWith("image/"), "File must be an image"),
});

type TrainerFormValues = z.infer<typeof trainerFormSchema>;

type TrainerLike = {
  _id: Id<"trainers">;
  name: string;
  email: string;
  phone: string;
  expertise: string[];
  description?: string;
  profilePicture?: Id<"_storage">;
};

export function EditTrainerDialog({
  open,
  onOpenChange,
  trainer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer: TrainerLike;
}) {
  const { toast } = useToast();
  const updateTrainer = useMutation(api.trainers.update);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = useMemo<TrainerFormValues>(
    () => ({
      name: trainer.name ?? "",
      email: trainer.email ?? "",
      phone: trainer.phone ?? "",
      expertise: (trainer.expertise?.length ? trainer.expertise : [""]) as string[],
      description: trainer.description ?? "",
      profilePicture: undefined,
    }),
    [trainer]
  );

  const form = useForm<TrainerFormValues>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues,
  });

  const expertise = form.watch("expertise");

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const addExpertise = () => {
    form.setValue("expertise", [...expertise, ""]);
  };

  const removeExpertise = (index: number) => {
    if (expertise.length > 1) {
      form.setValue(
        "expertise",
        expertise.filter((_, i) => i !== index)
      );
    }
  };

  const onSubmit = async (data: TrainerFormValues) => {
    setIsSubmitting(true);
    try {
      const filteredExpertise = data.expertise.filter((e) => e.trim().length > 0);

      // Upload image if provided
      let profilePictureStorageId: Id<"_storage"> | undefined;
      if (data.profilePicture) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": data.profilePicture.type },
          body: data.profilePicture,
        });
        const { storageId } = await result.json();
        profilePictureStorageId = storageId as Id<"_storage">;
      }

      await updateTrainer({
        id: trainer._id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        expertise: filteredExpertise,
        description: data.description || undefined,
        ...(profilePictureStorageId ? { profilePicture: profilePictureStorageId } : {}),
      });

      toast({
        variant: "success",
        title: "Success",
        description: "Trainer updated successfully!",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating trainer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update trainer. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] bg-black border-2" style={{ borderColor: "#F2D578" }}>
        <DialogHeader>
          <DialogTitle>Edit Trainer Profile</DialogTitle>
          <DialogDescription>
            Update trainer details. Changes will reflect immediately in Convex.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold" style={{ color: "#F2D578" }}>
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter trainer name"
                        {...field}
                        className="border-2"
                        style={{ borderColor: "#F2D578" }}
                      />
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
                    <FormLabel className="font-bold" style={{ color: "#F2D578" }}>
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                        className="border-2"
                        style={{ borderColor: "#F2D578" }}
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
                  <FormLabel className="font-bold" style={{ color: "#F2D578" }}>
                    Phone
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      {...field}
                      className="border-2"
                      style={{ borderColor: "#F2D578" }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label style={{ color: "#F2D578" }}>Expertise</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={addExpertise}
                  className="font-bold"
                  style={{ backgroundColor: "#F2D578", color: "#000000" }}
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
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder={`Expertise ${index + 1}`}
                              {...field}
                              className="border-2"
                              style={{ borderColor: "#F2D578" }}
                            />
                          </FormControl>
                          {expertise.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeExpertise(index)}
                              className="border-2"
                              style={{ borderColor: "#F2D578", color: "#F2D578" }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
                  <FormLabel className="font-bold" style={{ color: "#F2D578" }}>
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Trainer bio / description"
                      className="min-h-[100px] border-2"
                      style={{ borderColor: "#F2D578" }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field: { onChange } }) => (
                <FormItem>
                  <FormLabel className="font-bold" style={{ color: "#F2D578" }}>
                    Profile Picture (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      className="border-2"
                      style={{ borderColor: "#F2D578" }}
                      onChange={(e) => onChange(e.target.files?.[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Uploading a new image will replace the current one.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-2"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-bold border-2"
                style={{ backgroundColor: "#F2D578", color: "#000000", borderColor: "#F2D578" }}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

