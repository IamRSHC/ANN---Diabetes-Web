// Team page content. To add a photo, put the image in web/public/team/ with the file name below.
// Any size or shape works: the card crops it to fit, and the expand button opens the whole photo.
// `focus` moves the crop ('50% 20%' = centre, near the top). `full` is an optional separate uncropped file for the
// expanded view; without it the expanded view shows `photo` uncropped. If a photo is missing, the card shows initials.
export interface Member {
  name: string;
  reg: string;
  initials: string;
  photo: string;
  full?: string;
  focus?: string;
  contributions: string[];
}

export const TEAM: Member[] = [
  {
    name: 'Hareecharan R S',
    reg: 'RA2411026050331',
    initials: 'HR',
    photo: '/team/hareecharan.jpg',
    full: '/team/hareecharan-full.jpg',
    focus: '50% 18%',
    contributions: [
      'Led the project: chose the novelty and planned the reviews',
      'Designed the leakage-free split and locked test protocol',
      'Built Model 2: NumPy ANN with focal loss, MC dropout and calibration',
      'Ran the ablation, uncertainty and bias analysis',
      'Built and deployed the Streamlit app, this website and the API',
    ],
  },
  {
    name: 'V Shakthi Balan',
    reg: 'RA2411026050334',
    initials: 'SB',
    photo: '/team/shakthi-balan.jpg',
    full: '/team/shakthi-balan-full.jpg',
    focus: '50% 32%',
    contributions: [
      'Re-ran the full notebook on a second laptop to confirm the results reproduce',
      'Verified the API and all nine models against the notebook outputs',
      'Cross-checked every number in the report against the notebook',
      'Prepared the presentation in the SRM format for the project reviews',
    ],
  },
  {
    name: 'Manoranjan U S',
    reg: 'RA2411026050305',
    initials: 'MU',
    photo: '/team/manoranjan.jpg',
    full: '/team/manoranjan-full.jpg',
    focus: '50% 24%',
    contributions: [
      'Tested the screening wizard: invalid inputs, edge cases and all three outcomes',
      'Ran the six reference test profiles and reported the results',
      "Checked the deployed app's predictions against the notebook",
      'Helped write the report and suggested changes to the drafts',
    ],
  },
];
