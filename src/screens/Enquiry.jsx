import EnquiryRecord from '../components/EnquiryRecord.jsx';

export default function Enquiry({ params }) {
  return <EnquiryRecord id={params?.[0] || ''} variant="page" />;
}
