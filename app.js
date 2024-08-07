import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import { updateAvatar, deleteAvatar } from './controllers/profileController.js';
import { authenticate, authenticateUser, generateToken, verifyToken } from './auth.js';
import { getAvatars } from './functions/avatars.js';

// WebSocket
import https from 'https';
import { WebSocketServer } from 'ws';
// import bodyParser from 'body-parser';

import AWS from 'aws-sdk';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// const options = {
//     key: fs.readFileSync('private.key'),
//     cert: fs.readFileSync('certificate.crt'),
// };

// const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT
const app = express();
// const server = https.createServer(options, app);
const server = https.createServer(app);

// const server = https.createServer(options, app).listen(3010, () => {
//     console.log('HTTPS server running on port 3010');
// });
// For local server use
// const wss = new WebSocketServer({ port: WEBSOCKET_PORT });

const wss = new WebSocketServer({ server });


// app.use(bodyParser.json());

dotenv.config();


const prisma = new PrismaClient();
const PORT = process.env.PORT;

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse form data if needed
app.use(express.urlencoded({ extended: true }));

// Use cors middleware
// app.use(cors({
//     origin: process.env.FRONTEND_URL, // Replace with your frontend's URL
//     methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
//     allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
// }));

const allowedOrigins = process.env.FRONTEND_URL.split(',');

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) === -1) {
//       const msg = 'The CORS policy for this site does not ' +
//                   'allow access from the specified Origin.';
//       return callback(new Error(msg), false);
//     }
//     return callback(null, true);
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors()); // Respond to preflight requests


// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        console.log('Received:', message);
        // Handle the like functionality here
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Ensure the uploads directory exists
// const uploadDir = './uploads';
// **** Uploads will be handled by the cloud storage ****************
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir);
// }
// app.use('/uploads', express.static('uploads'));
// Set up multer for file uploads
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads');
//     },
//     filename: (req, file, cb) => {
// const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
// cb(null, `${uniqueSuffix}-${file.originalname}`);
//     },
// });
// const upload = multer({ storage });
// ****************************************************************

// Middleware to protect routes
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const user = verifyToken(token);
            req.user = user;
            next();
        } catch (error) {
            return res.sendStatus(403);
        }
    } else {
        res.sendStatus(401);
    }
};

const KM_TO_DEGREES_LAT = 1 / 111; // Approximate conversion factor from km to degrees latitude

function kmToDegreesLongitude(km, latitude) {
    return km / (111 * Math.cos(latitude * Math.PI / 180));
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Backend is working!' });
});

app.get('/presigned-url', (req, res) => {
    const { filename } = req.query;
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: filename,
        Expires: 60, // URL expiry time in seconds
        ContentType: req.query.filetype,
    };

    s3.getSignedUrl('putObject', params, (err, url) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json({ url });
    });
});

// Register route
app.post('/register', upload.array('avatars', 5), async (req, res) => {
    console.log('Files:', req.files);
    console.log('Body:', req.body);

    try {
        const { name, email, password, bio, location } = req.body;
        const avatarFiles = req.files || []; // Default to an empty array if undefined

        console.log('Avatar Files:', avatarFiles);

        const hashedPassword = await bcrypt.hash(password, 10);

        // Handle avatars array
        // const avatars = avatarFiles.length > 0
        //     ? avatarFiles.map(file => ({ url: file.path }))
        //     : []; // Handle case where no files are uploaded

        // Upload files to S3
        const avatarUrls = [];
        for (const file of avatarFiles) {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `avatars/${uniqueSuffix}-${file.originalname}`, // Unique filename
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            const uploadResult = await s3.upload(uploadParams).promise();
            avatarUrls.push(uploadResult.Location); // URL of the uploaded file
        }
        // Ensure location is parsed correctly
        let locationData = {};
        try {
            locationData = typeof location === 'string' ? JSON.parse(location) : location;
        } catch (error) {
            return res.status(400).send({ message: 'Invalid location data' });
        }

        // Ensure locationData contains required fields
        if (locationData && (locationData.latitude === undefined || locationData.longitude === undefined)) {
            return res.status(400).send({ message: 'Latitude and Longitude must be provided' });
        }

        // Create user with location data
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                bio,
                avatars: avatars.length > 0 ? { create: avatarUrls.map(url => ({ url })) } : undefined,
                location: {
                    create: {
                        latitude: locationData.latitude || null, // Default to null if not provided
                        longitude: locationData.longitude || null, // Default to null if not provided
                        placeName: locationData.placeName || null // Handle placeName
                    }
                }
            },
            include: {
                avatars: true,
                location: true
            }
        });

        const token = generateToken(newUser);
        res.status(201).send({ token });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send({ message: 'Error creating user', error: error.message });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await authenticateUser(email, password, prisma);
        const token = generateToken(user);
        res.send({ token });
    } catch (error) {
        res.status(401).send({ message: error.message });
    }
});

// Users route (requires authentication)
app.get('/users', authenticateJWT, async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Profile route (requires authentication)
app.get('/profile', authenticateJWT, async (req, res) => {
    const userId = req.user.id; // Get user ID from the authenticated token

    try {
        // Fetch user profile data, including avatars and location
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                avatars: true,
                location: true,
            },
        });

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Update profile route
app.put('/profile', authenticateJWT, upload.array('avatars', 5), async (req, res) => {
    const { name, bio, email, location } = req.body;
    const avatarFiles = req.files;
    const userId = req.user.id;

    console.log('Request body:', req.body);
    console.log('Avatar files:', avatarFiles);

    let locationData;
    if (typeof location === 'string') {
        try {
            locationData = JSON.parse(location);
        } catch (error) {
            console.error('Error parsing location:', error);
            return res.status(400).send({ message: 'Invalid location data' });
        }
    } else {
        locationData = location;
    }

    try {
        const updateData = {
            name,
            bio,
            email,
            location: locationData ? {
                update: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    placeName: locationData.placeName // Update placeName
                }
            } : undefined
        };

        // If avatar files are provided, update avatars
        if (avatarFiles && avatarFiles.length > 0) {
            const avatars = avatarFiles.map(file => ({ url: file.path }));
            updateData.avatars = {
                deleteMany: {},
                create: avatars,
            };
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                avatars: true,
                location: true,
            },
        });
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

app.get('/nearby-users', async (req, res) => {
    const { latitude, longitude, radius } = req.query; // Expecting latitude, longitude, and radius as query parameters

    try {
        const users = await User.find({
            location: {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radius / 3963.2] // Radius in miles
                }
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).send('Error fetching nearby users');
    }
});

// Feed (Nearby Users) route
app.get('/feed-harvesine', authenticateJWT, async (req, res) => {
    const { latitude, longitude, radiusKm } = req.query;
    const userId = req.user.id;

    if (!latitude || !longitude || !radiusKm) {
        return res.status(400).send({ message: 'Missing parameters' });
    }

    try {
        const nearbyUsers = await prisma.$queryRaw`
        SELECT u.id, u.name, u.placeName, u.locationId, l.latitude, l.longitude, a.url AS avatarUrl,
          (6371 * acos(cos(radians(${latitude})) * cos(radians(l.latitude)) * cos(radians(l.longitude) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(l.latitude)))) AS distance
        FROM User u
        JOIN Location l ON u.locationId = l.id
        LEFT JOIN Avatar a ON u.id = a.userId
        WHERE u.id != ${userId}
        HAVING distance <= ${radiusKm}
        ORDER BY distance;
      `;

        res.json(nearbyUsers);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Toggle like status for a user
app.post('/like', authenticateJWT, async (req, res) => {
    const userId = req.user.id;
    const { likedUserId } = req.body;

    console.log(`[INFO] Received like/unlike request from user ${userId} for user ${likedUserId}`);

    try {
        // Check if the user and the liked user exist
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        const likedUserExists = await prisma.user.findUnique({ where: { id: likedUserId } });

        if (!userExists) {
            console.log(`[ERROR] User with ID ${userId} not found`);
            return res.status(404).send({ message: 'User not found' });
        }

        if (!likedUserExists) {
            console.log(`[ERROR] Liked user with ID ${likedUserId} not found`);
            return res.status(404).send({ message: 'Liked user not found' });
        }

        // Check if the like already exists
        const existingLike = await prisma.like.findUnique({
            where: {
                likerId_likedId: {
                    likerId: userId,
                    likedId: likedUserId,
                },
            },
        });

        if (existingLike) {
            // If like exists, delete it (unlike)
            await prisma.like.delete({
                where: {
                    id: existingLike.id,
                },
            });
            console.log(`[INFO] Successfully removed like record from user ${userId} to user ${likedUserId}`);
            res.status(200).send({ message: 'Like removed successfully' });
        } else {
            // If like does not exist, create it (like)
            const like = await prisma.like.create({
                data: {
                    liker: { connect: { id: userId } },
                    liked: { connect: { id: likedUserId } },
                },
            });
            console.log(`[INFO] Successfully created like record from user ${userId} to user ${likedUserId}`);
            res.json(like);
        }
    } catch (error) {
        console.error(`[ERROR] An error occurred: ${error.message}`, { error });
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Route to check if the current user liked the specified user
app.get('/check-like', authenticateJWT, async (req, res) => {
    const currentUserId = req.user.id;
    const { userIdToCheck } = req.query; // Use req.query for query parameters

    console.log('Query parameters:', req.query); // Log the query parameters for debugging

    console.log(`Checking like status for likerId: ${currentUserId}, likedId: ${userIdToCheck}`);


    try {
        if (!userIdToCheck || !currentUserId) {
            return res.status(400).json({ error: 'Missing user IDs' });
        }

        // Convert IDs to integers and validate
        const parsedUserIdToCheck = parseInt(userIdToCheck, 10);
        const parsedCurrentUserId = parseInt(currentUserId, 10);

        console.log(`Checking like status for likerId: ${parsedCurrentUserId}, likedId: ${parsedUserIdToCheck}`);

        console.log('Checking like...')

        if (isNaN(parsedUserIdToCheck) || isNaN(parsedCurrentUserId)) {
            return res.status(400).json({ error: 'Invalid user IDs' });
        }

        // Example database check (replace with actual database query)
        const like = await prisma.like.findFirst({
            where: {
                likerId: parsedCurrentUserId,
                likedId: parsedUserIdToCheck,
            },
        });


        return res.json({ liked: !!like });
    } catch (error) {
        console.error('Error checking like status', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



// Like a user
app.post('/likeOnly', authenticateJWT, async (req, res) => {
    const userId = req.user.id;
    const { likedUserId } = req.body;

    console.log(`[INFO] Received like request from user ${userId} to like user ${likedUserId}`);

    try {
        // Check if the user and the liked user exist
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        const likedUserExists = await prisma.user.findUnique({ where: { id: likedUserId } });

        if (!userExists) {
            console.log(`[ERROR] User with ID ${userId} not found`);
            return res.status(404).send({ message: 'User not found' });
        }

        if (!likedUserExists) {
            console.log(`[ERROR] Liked user with ID ${likedUserId} not found`);
            return res.status(404).send({ message: 'Liked user not found' });
        }

        // Check if the like already exists
        const existingLike = await prisma.like.findUnique({
            where: {
                likerId_likedId: {
                    likerId: userId,
                    likedId: likedUserId,
                },
            },
        });

        if (existingLike) {
            console.log(`[INFO] User ${userId} already liked user ${likedUserId}`);
            return res.status(400).send({ message: 'You have already liked this user' });
        }

        // Create the like record
        const like = await prisma.like.create({
            data: {
                liker: { connect: { id: userId } },
                liked: { connect: { id: likedUserId } },
            },
        });

        console.log(`[INFO] Successfully created like record: ${JSON.stringify(like)}`);
        res.json(like);
    } catch (error) {
        console.error(`[ERROR] An error occurred: ${error.message}`, { error });
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Unlike a user
app.post('/unlike', authenticateJWT, async (req, res) => {
    const userId = req.user.id;
    const { likedUserId } = req.body;

    console.log(`[INFO] Received unlike request from user ${userId} to unlike user ${likedUserId}`);

    try {
        // Check if the user and the liked user exist
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        const likedUserExists = await prisma.user.findUnique({ where: { id: likedUserId } });

        if (!userExists) {
            console.log(`[ERROR] User with ID ${userId} not found`);
            return res.status(404).send({ message: 'User not found' });
        }

        if (!likedUserExists) {
            console.log(`[ERROR] Liked user with ID ${likedUserId} not found`);
            return res.status(404).send({ message: 'Liked user not found' });
        }

        // Check if the like exists
        const existingLike = await prisma.like.findUnique({
            where: {
                likerId_likedId: {
                    likerId: userId,
                    likedId: likedUserId,
                },
            },
        });

        if (!existingLike) {
            console.log(`[INFO] No existing like found from user ${userId} to user ${likedUserId}`);
            return res.status(400).send({ message: 'Like record does not exist' });
        }

        // Delete the like record
        await prisma.like.delete({
            where: {
                id: existingLike.id,
            },
        });

        console.log(`[INFO] Successfully removed like record from user ${userId} to user ${likedUserId}`);
        res.status(200).send({ message: 'Like removed successfully' });
    } catch (error) {
        console.error(`[ERROR] An error occurred: ${error.message}`, { error });
        res.status(500).send({ message: 'Internal server error' });
    }
});


// Get likes for a user
app.get('/likes', authenticateJWT, async (req, res) => {
    const userId = req.user.id;

    try {
        const likes = await prisma.like.findMany({
            where: {
                userId,
            },
            include: {
                liked: true,
            },
        });
        res.json(likes);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Get notifications for likes
app.get('/notifications', authenticateJWT, async (req, res) => {
    const userId = req.user.id;

    try {
        const notifications = await prisma.like.findMany({
            where: {
                likedUserId: userId,
            },
            include: {
                user: true,
            },
        });
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Feed (Nearby Users) route with location and radius as parameters
app.get('/feed', authenticateJWT, async (req, res) => {
    const { latitude, longitude, radiusKm = 1.0 } = req.query;

    // Validate the parameters
    if (!latitude || !longitude) {
        return res.status(400).send({ message: 'Latitude and longitude are required' });
    }

    const radiusKmFloat = parseFloat(radiusKm);
    const latitudeFloat = parseFloat(latitude);
    const longitudeFloat = parseFloat(longitude);

    if (isNaN(latitudeFloat) || isNaN(longitudeFloat) || isNaN(radiusKmFloat)) {
        return res.status(400).send({ message: 'Invalid parameters' });
    }

    const radiusDegreesLat = radiusKmFloat * KM_TO_DEGREES_LAT;
    const radiusDegreesLng = kmToDegreesLongitude(radiusKmFloat, latitudeFloat);

    try {
        const nearbyUsers = await prisma.user.findMany({
            where: {
                id: { not: req.user.id },
                location: {
                    latitude: {
                        gte: latitudeFloat - radiusDegreesLat,
                        lte: latitudeFloat + radiusDegreesLat,
                    },
                    longitude: {
                        gte: longitudeFloat - radiusDegreesLng,
                        lte: longitudeFloat + radiusDegreesLng,
                    },
                },
            },
            include: { avatars: true, location: true },
        });

        res.json(nearbyUsers);
    } catch (error) {
        console.error('Internal server error', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Feed (Nearby Users) route
app.get('/feed2', authenticateJWT, async (req, res) => {
    const userId = req.user.id;
    const { radius = 5 } = req.query; // Default radius to 5 km if not provided

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { location: true },
        });

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        const nearbyUsers = await prisma.user.findMany({
            where: {
                id: { not: userId },
                location: {
                    latitude: {
                        gte: user.location.latitude - radius / 111, // Approximate conversion from km to degrees
                        lte: user.location.latitude + radius / 111,
                    },
                    longitude: {
                        gte: user.location.longitude - radius / (111 * Math.cos(user.location.latitude * Math.PI / 180)),
                        lte: user.location.longitude + radius / (111 * Math.cos(user.location.latitude * Math.PI / 180)),
                    },
                },
            },
            include: { avatars: true, location: true },
        });

        res.json(nearbyUsers);
    } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
    }
});


// Define the route for fetching avatars
app.get('/avatars', async (req, res) => {
    try {
        const avatars = await getAvatars(); // Replace with your function to get avatars
        res.json(avatars);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching avatars' });
    }
});

// Update avatar
app.put('/profile/avatar', authenticate, updateAvatar);

// Delete avatar
app.delete('/profile/avatar/:avatarId', authenticate, deleteAvatar);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
