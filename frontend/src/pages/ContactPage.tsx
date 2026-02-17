import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import './ContactPage.css';

export function ContactPage() {
  const { user, isAuthenticated } = useAuthStore();

  const [name, setName] = useState(isAuthenticated ? (user?.displayName ?? '') : '');
  const [email, setEmail] = useState(isAuthenticated ? (user?.email ?? '') : '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await api.contact.send({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch {
      setError('Failed to send message. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-inner">
        <h1>Contact Us</h1>
        <p className="contact-subtitle">
          Have a question, suggestion, or need help? We'd love to hear from you.
        </p>

        {success ? (
          <Card className="contact-success">
            <h2>Message Sent</h2>
            <p>Thank you for reaching out. We'll get back to you as soon as possible.</p>
            <Button variant="secondary" onClick={() => setSuccess(false)}>
              Send Another Message
            </Button>
          </Card>
        ) : (
          <Card className="contact-card">
            <form onSubmit={handleSubmit} className="contact-form">
              <Input
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                disabled={isAuthenticated}
              />
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isAuthenticated}
              />
              <Input
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this about?"
                required
              />
              <Textarea
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more…"
                rows={6}
                required
              />

              {error && <p className="contact-error">{error}</p>}

              <Button
                variant="primary"
                type="submit"
                isLoading={submitting}
                disabled={!name.trim() || !email.trim() || !subject.trim() || !message.trim()}
              >
                Send Message
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
