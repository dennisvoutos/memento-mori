import { Modal, Typography } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import './PrivacyNoticeModal.css';

const { Title, Paragraph, Text } = Typography;

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyNoticeModal({ isOpen, onClose }: PrivacyNoticeModalProps) {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SafetyOutlined />
          Privacy Notice
        </span>
      }
      footer={null}
      width={640}
      centered
      styles={{
        body: { maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 },
      }}
    >
      <div className="privacy-notice-content">
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
          Last updated: February 17, 2026
        </Text>

        <section>
          <Title level={5}>Data We Collect</Title>
          <ul>
            <li><Text strong>Account information:</Text> Name, email address, and password (securely hashed).</li>
            <li><Text strong>Memorial content:</Text> Text, photos, dates, and any content you choose to upload.</li>
            <li><Text strong>Usage data:</Text> Basic analytics like page visits and feature usage to improve the Service.</li>
          </ul>
        </section>

        <section>
          <Title level={5}>How We Use Your Data</Title>
          <ul>
            <li>To operate and provide the memorial platform.</li>
            <li>To authenticate your account and secure your sessions.</li>
            <li>To send important communications about your account (e.g., password resets).</li>
            <li>To improve the quality and performance of the Service.</li>
          </ul>
        </section>

        <section>
          <Title level={5}>Data Sharing</Title>
          <Paragraph>
            We do <Text strong>not</Text> sell, rent, or share your personal data with third parties
            for marketing purposes. Data is only shared:
          </Paragraph>
          <ul>
            <li>When you make a memorial public or share it via a link.</li>
            <li>With service providers who help us operate (e.g., hosting, email delivery).</li>
            <li>When required by law or to protect our legal rights.</li>
          </ul>
        </section>

        <section>
          <Title level={5}>Data Security</Title>
          <Paragraph>
            We use industry-standard security measures including encrypted passwords (bcrypt),
            HTTP-only secure cookies for authentication, and HTTPS for all data in transit.
          </Paragraph>
        </section>

        <section>
          <Title level={5}>Your Rights</Title>
          <Paragraph>You have the right to:</Paragraph>
          <ul>
            <li>Access your personal data.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and data.</li>
            <li>Export your data in a portable format.</li>
          </ul>
          <Paragraph>
            To exercise these rights, contact us at{' '}
            <a href="mailto:dennisvoutos@gmail.com">dennisvoutos@gmail.com</a>.
          </Paragraph>
        </section>

        <section>
          <Title level={5}>Cookies</Title>
          <Paragraph>
            We use essential cookies only — specifically a secure, HTTP-only session cookie for
            authentication. We do not use advertising or tracking cookies.
          </Paragraph>
        </section>

        <section>
          <Title level={5}>Contact</Title>
          <Paragraph>
            For privacy-related inquiries, reach us at{' '}
            <a href="mailto:dennisvoutos@gmail.com">dennisvoutos@gmail.com</a>.
          </Paragraph>
        </section>
      </div>
    </Modal>
  );
}
