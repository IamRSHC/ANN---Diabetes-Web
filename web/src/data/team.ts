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
      'Led the project: problem statement, novelty and review plan',
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
    contributions: [],
  },
  {
    name: 'Manoranjan U S',
    reg: 'RA2411026050305',
    initials: 'MU',
    photo: '/team/manoranjan.jpg',
    full: '/team/manoranjan-full.jpg',
    focus: '50% 24%',
    contributions: [],
  },
];
