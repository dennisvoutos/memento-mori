import { CloudOutlined, InfoCircleOutlined } from '@ant-design/icons';

export function ICloudPhotosPicker() {
  return (
    <div className="icloud-photos-placeholder">
      <CloudOutlined className="icloud-photos-icon" />
      <h4>iCloud Photos</h4>
      <p>
        Apple does not currently provide a public web API for browsing iCloud Photos
        directly from the browser.
      </p>
      <div className="icloud-photos-info">
        <InfoCircleOutlined />
        <span>Here's how to use your iCloud photos:</span>
        <ol>
          <li>Visit{' '}
            <a href="https://www.icloud.com/photos" target="_blank" rel="noreferrer">
              iCloud Photos
            </a>{' '}
            in your browser.
          </li>
          <li>Select and download the photos you want to your computer.</li>
          <li>Switch to the <strong>My Computer</strong> tab above to upload them.</li>
        </ol>
      </div>
      <p className="icloud-photos-note">
        We're monitoring Apple's API announcements. If an official iCloud Photos web API
        becomes available, we'll add direct integration.
      </p>
    </div>
  );
}
