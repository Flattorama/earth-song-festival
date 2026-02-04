import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

const volunteerFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  aboutYou: z.string().min(20, "Please tell us a bit more about yourself"),
  availability: z.string().min(10, "Please describe your availability"),
  experience: z.string().optional(),
  whyEarthSong: z.string().min(20, "Please share what calls you to this gathering"),
});

type VolunteerFormValues = z.infer<typeof volunteerFormSchema>;

const VolunteerSection = () => {
  const { toast } = useToast();

  const form = useForm<VolunteerFormValues>({
    resolver: zodResolver(volunteerFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      aboutYou: "",
      availability: "",
      experience: "",
      whyEarthSong: "",
    },
  });

  const onSubmit = async (data: VolunteerFormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Volunteer application submitted:", data);

    toast({
      title: "Application Received!",
      description: "Thank you for your application! We've received it and will be in touch soon.",
    });

    form.reset();
  };

  return (
    <section id="volunteer" className="py-20 md:py-28 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <p className="text-small-caps text-gold tracking-[0.2em] text-sm mb-4">
              VOLUNTEER
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">
              Join Our Village Crew
            </h2>
            <div className="space-y-4 text-secondary-foreground/80 leading-relaxed mb-8">
              <p>
                Earth Song is co-created by a dedicated team of volunteers who help bring the vision to life. If you feel called to serve, support, and be part of the behind-the-scenes magic, we'd love to hear from you.
              </p>
              <p>
                Volunteers receive complimentary admission in exchange for a commitment of service hours before and during the event. Roles vary from setup and registration to facilitator support and leave-no-trace coordination.
              </p>
              <p className="font-serif text-lg italic text-gold">
                This is more than volunteering—it's an invitation to be part of the inner circle.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              Applications close March 1, 2026
            </div>
          </div>

          <div className="bg-secondary-foreground/5 rounded-2xl p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary-foreground">Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-fullName"
                          placeholder="Your full name"
                          className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-secondary-foreground">Email Address *</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-email"
                            type="email"
                            placeholder="your@email.com"
                            className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-secondary-foreground">Phone Number *</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-phone"
                            type="tel"
                            placeholder="Your phone number"
                            className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50"
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
                  name="aboutYou"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary-foreground">Tell us about yourself *</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-aboutYou"
                          placeholder="Share a bit about who you are, your background, and what draws you to this work..."
                          className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50 min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary-foreground">Availability *</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-availability"
                          placeholder="Are you available August 7-9, 2026? Any dates you cannot attend?"
                          className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary-foreground">Relevant Experience</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-experience"
                          placeholder="Have you volunteered at festivals, retreats, or similar events before? Tell us about it..."
                          className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whyEarthSong"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-secondary-foreground">Why Earth Song? *</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-whyEarthSong"
                          placeholder="What calls you to be part of this gathering?"
                          className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  data-testid="button-submit-volunteer"
                  disabled={form.formState.isSubmitting}
                  className="w-full bg-gold text-foreground font-medium py-6"
                >
                  {form.formState.isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>

                <p className="text-secondary-foreground/60 text-sm text-center">
                  We'll review applications on a rolling basis and be in touch within 2 weeks.
                </p>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VolunteerSection;
