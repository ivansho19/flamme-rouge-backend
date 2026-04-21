import mongoose from "mongoose";
import TopRojo from "../models/TopRojo.js";
import Profile from "../models/profile.js";
import Stripe from "stripe";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// Plan pricing and duration
const PLANS = {
  top_24h: { price: 2999, hours: 24 }, // $29.99
  top_3d: { price: 6999, hours: 72 }, // $69.99
  top_7d: { price: 12999, hours: 168 } // $129.99
};

// POST /api/profiles/top-rojo/create
export const createTopRojo = async (req, res) => {
  try {
    const { profileId, planType, city, country, title, description, contactPhone, images } = req.body;

    // Validate required fields
    if (!profileId || !planType || !city || !country || !title || !description || !contactPhone || !images) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Validate plan type
    if (!PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type"
      });
    }

    // Check if profile exists and get userId
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    const userId = profile.objectId;

    // Check if user already has an active top-rojo for this city
    const existingTopRojo = await TopRojo.findOne({
      userId,
      city,
      country,
      status: "active"
    });

    if (existingTopRojo) {
      return res.status(400).json({
        success: false,
        message: "User already has an active top-rojo for this city"
      });
    }

    // Calculate end date
    const now = new Date();
    const endDate = new Date(now.getTime() + PLANS[planType].hours * 60 * 60 * 1000);

    // Create payment intent with Stripe
    let paymentUrl = null;
    let paymentId = null;

    try {
      const paymentIntent = await getStripe().paymentIntents.create({
        amount: PLANS[planType].price,
        currency: "usd",
        metadata: {
          profileId,
          userId,
          planType,
          city,
          country
        }
      });
      paymentId = paymentIntent.id;
      paymentUrl = `${process.env.FRONTEND_URL}/checkout?clientSecret=${paymentIntent.client_secret}`;
    } catch (stripeError) {
      return res.status(500).json({
        success: false,
        message: "Payment processing failed",
        error: stripeError.message
      });
    }

    // Create top-rojo entry
    const topRojo = new TopRojo({
      profileId,
      userId,
      planType,
      city,
      country,
      title,
      description,
      contactPhone,
      images,
      endDate,
      paymentId,
      status: "active"
    });

    await topRojo.save();

    // Populate profile info for response
    const response = {
      success: true,
      topRojo: {
        id: topRojo._id,
        profileId: topRojo.profileId,
        planType: topRojo.planType,
        city: topRojo.city,
        country: topRojo.country,
        title: topRojo.title,
        description: topRojo.description,
        contactPhone: topRojo.contactPhone,
        images: topRojo.images,
        startDate: topRojo.startDate,
        endDate: topRojo.endDate,
        viewCount: topRojo.viewCount,
        clickCount: topRojo.clickCount,
        status: topRojo.status,
        position: topRojo.position
      }
    };

    if (paymentUrl) {
      response.paymentUrl = paymentUrl;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating top-rojo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// GET /api/profiles/top-rojo/user/:userId/my-tops
export const getMyTops = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const myTops = await TopRojo.find({ userId });

    // Categorize tops
    const activeTops = myTops.filter(top => top.status === "active" && new Date(top.endDate) > new Date());
    const expiredTops = myTops.filter(top => top.status === "expired" || new Date(top.endDate) <= new Date());
    const cancelledTops = myTops.filter(top => top.status === "cancelled");

    const mapTop = (top) => ({
      id: top._id,
      title: top.title,
      description: top.description,
      contactPhone: top.contactPhone,
      images: top.images,
      planType: top.planType,
      city: top.city,
      country: top.country,
      status: top.status,
      startDate: top.startDate,
      endDate: top.endDate,
      viewCount: top.viewCount,
      clickCount: top.clickCount,
      position: top.position,
      createdAt: top.createdAt
    });

    const dashboard = {
      success: true,
      stats: {
        totalTops: myTops.length,
        activeTops: activeTops.length,
        expiredTops: expiredTops.length,
        cancelledTops: cancelledTops.length,
        totalViews: myTops.reduce((sum, top) => sum + top.viewCount, 0),
        totalClicks: myTops.reduce((sum, top) => sum + top.clickCount, 0)
      },
      activeTops: activeTops.map(mapTop),
      expiredTops: expiredTops.map(mapTop)
    };

    res.status(200).json(dashboard);
  } catch (error) {
    console.error("Error fetching user tops:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// GET /api/profiles/top-rojo/all
export const getAllTops = async (req, res) => {
  try {
    const tops = await TopRojo.find({
      status: "active",
      endDate: { $gt: new Date() }
    }).sort({ position: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      total: tops.length,
      tops: tops.map(top => ({
        id: top._id,
        profileId: top.profileId,
        title: top.title,
        description: top.description,
        contactPhone: top.contactPhone,
        images: top.images,
        planType: top.planType,
        city: top.city,
        country: top.country,
        position: top.position,
        viewCount: top.viewCount,
        clickCount: top.clickCount,
        endDate: top.endDate
      }))
    });
  } catch (error) {
    console.error("Error fetching all tops:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// GET /api/profiles/top-rojo/city/:city/:country
export const getTopRojoByCity = async (req, res) => {
  try {
    const { city, country } = req.params;

    // Get active tops for this city ordered by position
    const tops = await TopRojo.find({
      city,
      country,
      status: "active",
      endDate: { $gt: new Date() }
    })
      .populate("profileId")
      .sort({ position: 1, createdAt: -1 });

    // Update positions if needed
    tops.forEach((top, index) => {
      top.position = index + 1;
    });

    const response = {
      success: true,
      city,
      country,
      totalTops: tops.length,
      tops: tops.map(top => ({
        id: top._id,
        profile: {
          id: top.profileId._id,
          displayName: top.profileId.displayName,
          bio: top.profileId.bio,
          imagesMain: top.profileId.imagesMain,
          age: top.profileId.age,
          gender: top.profileId.gender
        },
        planType: top.planType,
        viewCount: top.viewCount,
        clickCount: top.clickCount,
        position: top.position,
        startDate: top.startDate,
        endDate: top.endDate
      }))
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching tops by city:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// POST /api/profiles/top-rojo/:id/renew
export const renewTopRojo = async (req, res) => {
  try {
    const { id } = req.params;
    const { planType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid top-rojo ID"
      });
    }

    if (!planType || !PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type"
      });
    }

    const topRojo = await TopRojo.findById(id);
    if (!topRojo) {
      return res.status(404).json({
        success: false,
        message: "Top-rojo not found"
      });
    }

    // Create new payment intent
    let paymentId = null;
    try {
      const paymentIntent = await getStripe().paymentIntents.create({
        amount: PLANS[planType].price,
        currency: "usd",
        metadata: {
          topRojoId: id,
          renewalType: "renew"
        }
      });
      paymentId = paymentIntent.id;
    } catch (stripeError) {
      return res.status(500).json({
        success: false,
        message: "Payment processing failed",
        error: stripeError.message
      });
    }

    // Update plan type and end date
    const now = new Date();
    topRojo.planType = planType;
    topRojo.endDate = new Date(now.getTime() + PLANS[planType].hours * 60 * 60 * 1000);
    topRojo.paymentId = paymentId;
    topRojo.status = "active";

    await topRojo.save();
    await topRojo.populate("profileId");

    res.status(200).json({
      success: true,
      topRojo: {
        id: topRojo._id,
        planType: topRojo.planType,
        endDate: topRojo.endDate,
        status: topRojo.status
      }
    });
  } catch (error) {
    console.error("Error renewing top-rojo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// POST /api/profiles/top-rojo/:id/cancel
export const cancelTopRojo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid top-rojo ID"
      });
    }

    const topRojo = await TopRojo.findById(id);
    if (!topRojo) {
      return res.status(404).json({
        success: false,
        message: "Top-rojo not found"
      });
    }

    topRojo.status = "cancelled";
    topRojo.active = false;
    await topRojo.save();

    res.status(200).json({
      success: true,
      message: "Top-rojo cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling top-rojo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
