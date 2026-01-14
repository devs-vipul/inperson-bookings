import React from "react";
import {
  Html,
  Head,
  Font,
  Img,
  Container,
  Section,
  Heading,
  Text,
  Tailwind,
  Button,
  Row,
  Column,
} from "@react-email/components";

interface BookingConfirmationUserProps {
  userName: string;
  trainerName: string;
  sessionName: string;
  sessionsPerWeek: number;
  duration: number;
  slots: Array<{
    date: string; // "YYYY-MM-DD"
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
  }>;
}

export default function BookingConfirmationUser({
  userName,
  trainerName,
  sessionName,
  sessionsPerWeek,
  duration,
  slots,
}: BookingConfirmationUserProps) {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time to 12-hour format
  const formatTime = (time24h: string): string => {
    const [hours, minutes] = time24h.split(":").map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <Tailwind>
      <Html>
        <Head>
          <Font
            fontFamily="Arial, Helvetica, sans-serif"
            fallbackFontFamily="Arial"
          />
        </Head>
        <Container
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            backgroundColor: "#000000",
            padding: "20px",
            borderRadius: "8px",
            color: "#ffffff",
          }}
        >
          {/* Header with Logo */}
          <Section style={{ textAlign: "center", paddingBottom: "20px" }}>
            <Img
              src="https://www.breezewayfitness.com/assets/images/Main-logo-New.png"
              alt="Breezeway Fitness Center"
              width="150"
              style={{ margin: "0 auto" }}
            />
          </Section>

          {/* Body */}
          <Section
            style={{
              backgroundColor: "#1a1a1a",
              padding: "30px",
              borderRadius: "8px",
              color: "#ffffff",
            }}
          >
            <Heading
              style={{
                fontSize: "28px",
                color: "#ffffff",
                marginBottom: "15px",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Booking Confirmation
            </Heading>
            <Text
              style={{
                fontSize: "16px",
                color: "#d9d9d9",
                marginBottom: "20px",
                lineHeight: "1.6",
              }}
            >
              Hi {userName},
            </Text>
            <Text
              style={{
                fontSize: "16px",
                color: "#d9d9d9",
                marginBottom: "20px",
                lineHeight: "1.6",
              }}
            >
              Your training session booking has been confirmed! We're excited to
              help you achieve your fitness goals.
            </Text>

            {/* Booking Details */}
            <Section
              style={{
                backgroundColor: "#333333",
                padding: "25px",
                borderRadius: "8px",
                marginBottom: "20px",
                color: "#ffffff",
              }}
            >
              <Text
                style={{
                  fontSize: "18px",
                  color: "#ffffff",
                  fontWeight: "bold",
                  marginBottom: "15px",
                }}
              >
                Booking Details
              </Text>
              <Text style={{ fontSize: "14px", color: "#d9d9d9", marginBottom: "8px" }}>
                <strong>Trainer:</strong> {trainerName}
              </Text>
              <Text style={{ fontSize: "14px", color: "#d9d9d9", marginBottom: "8px" }}>
                <strong>Session Package:</strong> {sessionName}
              </Text>
              <Text style={{ fontSize: "14px", color: "#d9d9d9", marginBottom: "8px" }}>
                <strong>Sessions per Week:</strong> {sessionsPerWeek}
              </Text>
              <Text style={{ fontSize: "14px", color: "#d9d9d9", marginBottom: "15px" }}>
                <strong>Duration:</strong> {duration} minutes per session
              </Text>

              {/* Sessions List */}
              <Text
                style={{
                  fontSize: "16px",
                  color: "#ffffff",
                  fontWeight: "bold",
                  marginTop: "20px",
                  marginBottom: "10px",
                }}
              >
                Your Scheduled Sessions:
              </Text>
              {slots.map((slot, index) => (
                <Section
                  key={index}
                  style={{
                    backgroundColor: "#2a2a2a",
                    padding: "15px",
                    borderRadius: "6px",
                    marginBottom: "10px",
                  }}
                >
                  <Text
                    style={{
                      fontSize: "15px",
                      color: "#F2D679",
                      fontWeight: "bold",
                      marginBottom: "8px",
                    }}
                  >
                    Session {index + 1}
                  </Text>
                  <Text style={{ fontSize: "14px", color: "#d9d9d9", marginBottom: "5px" }}>
                    <strong>Date:</strong> {formatDate(slot.date)}
                  </Text>
                  <Text style={{ fontSize: "14px", color: "#d9d9d9" }}>
                    <strong>Time:</strong> {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </Text>
                </Section>
              ))}
            </Section>

            <Text
              style={{
                fontSize: "16px",
                color: "#d9d9d9",
                marginBottom: "20px",
                lineHeight: "1.6",
              }}
            >
              If you have any questions or need to reschedule, please contact us.
              We're here to support you on your fitness journey!
            </Text>

            <Section
              style={{
                textAlign: "center",
                marginTop: "30px",
              }}
            >
              <Button
                href="https://www.breezewayfitness.com/your-bookings"
                style={{
                  backgroundColor: "#F2D679",
                  color: "#000000",
                  padding: "12px 30px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                View My Bookings
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Section
            style={{
              textAlign: "center",
              marginTop: "20px",
              padding: "20px 0",
            }}
          >
            <Text
              style={{
                fontSize: "14px",
                color: "#d9d9d9",
                marginBottom: "15px",
              }}
            >
              Follow us on:
            </Text>

            {/* Social Icons */}
            <table
              style={{
                margin: "0 auto",
                textAlign: "center",
              }}
            >
              <tr>
                <td style={{ padding: "0 10px" }}>
                  <a href="https://www.facebook.com/kvazquez0911/">
                    <Img
                      src="https://cdn-icons-png.flaticon.com/512/145/145802.png"
                      alt="Facebook"
                      width="24"
                    />
                  </a>
                </td>
                <td style={{ padding: "0 10px" }}>
                  <a href="https://www.instagram.com/breezeway_fitness_center">
                    <Img
                      src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png"
                      alt="Instagram"
                      width="24"
                    />
                  </a>
                </td>
                <td style={{ padding: "0 10px" }}>
                  <a href="https://www.youtube.com/@BreezewayFitnessCenter">
                    <Img
                      src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png"
                      alt="Youtube"
                      width="24"
                    />
                  </a>
                </td>
                <td style={{ padding: "0 10px" }}>
                  <a href="https://twitter.com/breezefit1">
                    <Img
                      src="https://cdn-icons-png.flaticon.com/512/733/733579.png"
                      alt="Twitter"
                      width="24"
                    />
                  </a>
                </td>
              </tr>
            </table>

            <Text
              style={{ fontSize: "12px", color: "#ffffff", marginTop: "20px" }}
            >
              602 Ryan Ave Unit T-1, Westville, NJ 08093, United States // +1
              609 605 1959
            </Text>
            <Text
              style={{ fontSize: "12px", color: "#ffffff", marginTop: "5px" }}
            >
              Visit our website —
              <a
                href="https://www.breezewayfitness.com"
                style={{ color: "#F2D679", textDecoration: "none" }}
              >
                {" "}www.breezewayfitness.com
              </a>
            </Text>

            <Text
              style={{ fontSize: "12px", color: "#777777", marginTop: "20px" }}
            >
              &copy; 2024 Breezeway Fitness Center. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Html>
    </Tailwind>
  );
}
