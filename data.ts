import { Book, User } from './types';

export const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'WINGS OF FIRE',
    author: 'A.P.J. Abdul Kalam with Arun Tiwari',
    genre: 'Autobiography',
    coverImage: 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1588286863i/634583.jpg',
    standNumber: 'A-101',
    isAvailable: true,
    description: 'The inspiring autobiography of Dr. A.P.J. Abdul Kalam, the former President of India.',
    waitlist: []
  },
  {
    id: '2',
    title: "THE DIAMOND BROTHERS IN.... THE FALCON'S MALTESER",
    author: 'Anthony Horowitz',
    genre: 'Fiction, adventure',
    coverImage: 'https://m.media-amazon.com/images/I/81AYUU0RLWL._UF1000,1000_QL80_.jpg',
    standNumber: 'B-204',
    isAvailable: true,
    description: 'The first hilarious mystery featuring the world\'s worst private detective, Tim Diamond, and his clever younger brother Nick.',
    waitlist: []
  },
  {
    id: '3',
    title: 'THE ADVENTURES OF SHERLOCK HOLMES',
    author: 'Arthur Conan Doyle',
    genre: 'Fiction, adventure',
    coverImage: 'https://m.media-amazon.com/images/I/71tvs98+5vL.jpg',
    standNumber: 'C-305',
    isAvailable: true,
    description: 'A collection of twelve short stories featuring the famous consulting detective Sherlock Holmes.',
    waitlist: []
  },
  {
    id: '4',
    title: 'जावे भावनांच्या गावा',
    author: 'Dr. Sandip Kelkar',
    genre: 'Self-help',
    coverImage: 'https://m.media-amazon.com/images/I/61+tOwWG6-L._UF1000,1000_QL80_.jpg',
    standNumber: 'D-401',
    isAvailable: true,
    description: 'A profound exploration of emotions and emotional intelligence in Marathi.',
    waitlist: []
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Yash Kekan',
    libraryId: 'PP1707',
    password: 'Yyk@1612',
    email: 'yashkekan313@gmail.com',
    role: 'USER',
    xp: 0,
    badges: []
  }
];

export const INITIAL_ADMINS: User[] = [
  {
    id: 'a-1',
    name: 'Head Librarian',
    libraryId: 'ADMIN01',
    password: 'adminpassword',
    email: 'admin@vaymn.com',
    role: 'ADMIN',
    xp: 0,
    badges: []
  }
];
