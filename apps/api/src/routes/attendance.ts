import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, optionalAuth, AuthRequest } from "../middleware/auth";
import { parseMeetName, normalizeRegisterNo } from "../utils/parseRegNo";
import { nanoid } from "../utils/nanoid";

const router = Router();

// Helper to check allowed email domain
function isEmailAllowed(email: string, allowedDomains: string[], allowedEmails: string[]): boolean {
  if (allowedEmails.length > 0) {
    if (allowedEmails.map(e=>e.toLowerCase()).includes(email.toLowerCase())) return true;
  }
  if (allowedDomains.length > 0) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (allowedDomains.map(d=>d.toLowerCase()).includes(domain||"")) return true;
    return false;
  }
  // if both empty, allow all
  if (allowedEmails.length===0 && allowedDomains.length===0) return true;
  return allowedEmails.length>0 ? false : true;
}

// Zod schemas
const createInPersonSchema = z.object({
  title: z.string().min(3).max(100),
  venue: z.string().max(100).optional(),
  date: z.string().min(1), // ISO date string
  startTime: z.string().min(1), // ISO datetime or time string
  endTime: z.string().optional(),
  allowedEmailDomains: z.array(z.string()).optional(),
  allowedEmails: z.array(z.string().email()).optional(),
  categorySlug: z.string().optional(),
  categoryId: z.string().optional(),
  points: z.number().int().min(1).max(1000).optional(),
});

const createMeetSchema = z.object({
  title: z.string().min(3).max(100),
  meetLink: z.string().url().optional(),
  meetCode: z.string().optional(),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  categorySlug: z.string().optional(),
  categoryId: z.string().optional(),
  points: z.number().int().min(1).max(1000).optional(),
});

// POST /api/attendance/in-person – create in-person session + event
router.post("/in-person", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (req: AuthRequest, res) => {
  const parsed = createInPersonSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error: parsed.error.flatten() });
  const { title, venue, date, startTime, endTime, allowedEmailDomains=[], allowedEmails=[], categorySlug, categoryId, points } = parsed.data;

  let catId = categoryId;
  if (!catId && categorySlug) {
    const cat = await prisma.category.findUnique({ where:{slug:categorySlug}});
    if (!cat) return res.status(404).json({ success:false, error:"Category not found"});
    catId = cat.id;
  }

  const slug = nanoid(6); // like 15e2b1
  const dateObj = new Date(date);
  const startObj = new Date(startTime);
  const endObj = endTime ? new Date(endTime) : null;
  if (isNaN(dateObj.getTime()) || isNaN(startObj.getTime())) return res.status(400).json({ success:false, error:"Invalid date/startTime"});

  const session = await prisma.attendanceSession.create({
    data: {
      title, type:"IN_PERSON", venue: venue||null, date: dateObj, startTime: startObj, endTime: endObj,
      createdById: req.user!.id, allowedEmailDomains: JSON.stringify(allowedEmailDomains), allowedEmails: JSON.stringify(allowedEmails),
      status:"OPEN", categoryId: catId||null, points: points||null,
    }
  });

  const event = await prisma.inPersonEvent.create({
    data: {
      slug, title, sessionId: session.id, venue: venue||null, date: dateObj, startTime: startObj, endTime: endObj,
      allowedEmailDomains: JSON.stringify(allowedEmailDomains), allowedEmails: JSON.stringify(allowedEmails),
      createdById: req.user!.id,
    }
  });

  return res.status(201).json({ success:true, data:{ session, event, shareUrl: `/in-person/${slug}` }});
});

// POST /api/attendance/meet – create meet session (for extension or manual)
router.post("/meet", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (req: AuthRequest, res) => {
  const parsed = createMeetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error: parsed.error.flatten() });
  const { title, meetLink, meetCode, date, startTime, endTime, categorySlug, categoryId, points } = parsed.data;
  let catId = categoryId;
  if (!catId && categorySlug) {
    const cat = await prisma.category.findUnique({ where:{slug:categorySlug}});
    if (!cat) return res.status(404).json({ success:false, error:"Category not found"});
    catId = cat.id;
  }
  const dateObj = new Date(date);
  const startObj = startTime ? new Date(startTime) : dateObj;
  const endObj = endTime ? new Date(endTime) : null;
  if (isNaN(dateObj.getTime())) return res.status(400).json({ success:false, error:"Invalid date"});

  const code = meetCode || (meetLink ? meetLink.split("/").pop()||null : null);

  const session = await prisma.attendanceSession.create({
    data: {
      title, type:"MEET", meetCode: code, meetLink: meetLink||null, date: dateObj, startTime: startObj, endTime: endObj,
      createdById: req.user!.id, status:"OPEN", categoryId: catId||null, points: points||null,
    }
  });
  return res.status(201).json({ success:true, data:{ session }});
});

// POST /api/attendance/meet/:id/participants – extension bulk upload
router.post("/meet/:id/participants", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (req: AuthRequest, res) => {
  const sessionId = String(req.params.id);
  const session = await prisma.attendanceSession.findUnique({ where:{id:sessionId}});
  if (!session || session.type!=="MEET") return res.status(404).json({ success:false, error:"Meet session not found"});
  const participants = (req.body.participants || req.body) as Array<{ name?:string, rawName?:string, email?:string, avatarUrl?:string, joinTime?:string, leaveTime?:string, attendedDuration?:number, lastAttendedTimeStamp?:string }>;
  if (!Array.isArray(participants)) return res.status(400).json({ success:false, error:"participants array required"});

  let imported=0, skipped=0;
  for (const p of participants) {
    const rawName = String(p.rawName || p.name || "").trim();
    if (!rawName) { skipped++; continue; }
    const { cleanName, registerNo } = parseMeetName(rawName);
    const email = p.email ? String(p.email).trim().toLowerCase() : null;
    // resolve user by registerNo first, then email
    let userId: string | null = null;
    if (registerNo) {
      const u = await prisma.user.findUnique({ where:{registerNo}});
      if (u) userId = u.id;
    }
    if (!userId && email) {
      const u = await prisma.user.findFirst({ where:{ OR:[{email}, {vitEmail:email}]}});
      if (u) userId = u.id;
    }
    const joinTime = p.joinTime ? new Date(`1970-01-01T${p.joinTime}`) : (p.lastAttendedTimeStamp ? new Date(p.lastAttendedTimeStamp) : null);
    // better: if joinTime is like "10:20:30" treat as today + time? For now store as is with date = session.date
    // We will store attendedDuration and mark isPresent if > 50% or > 30min
    const attendedDuration = p.attendedDuration ? Number(p.attendedDuration) : null;
    // isPresent heuristic: if duration > 30*60 or > half session? For now if attendedDuration > 1
    const isPresent = attendedDuration ? attendedDuration > 60 : false; // >1 min

    // upsert by registerNo or email
    try {
      // Need to handle unique constraints: try find existing first
      const existing = registerNo ? await prisma.attendanceRecord.findFirst({ where:{ sessionId, registerNo }}) : (email ? await prisma.attendanceRecord.findFirst({ where:{ sessionId, email }}) : null);
      if (existing) {
        // update max duration
        await prisma.attendanceRecord.update({
          where:{ id: existing.id },
          data:{
            rawName, cleanName, registerNo: registerNo||existing.registerNo, email: email||existing.email,
            attendedDuration: Math.max(existing.attendedDuration||0, attendedDuration||0),
            isPresent: isPresent || existing.isPresent,
            userId: userId || existing.userId,
            joinTime: joinTime || existing.joinTime,
            leaveTime: p.leaveTime ? new Date(`1970-01-01T${p.leaveTime}`) : existing.leaveTime,
          }
        });
      } else {
        await prisma.attendanceRecord.create({
          data:{
            sessionId, userId, rawName, cleanName, registerNo, email,
            joinTime: joinTime||null, leaveTime: p.leaveTime ? new Date(`1970-01-01T${p.leaveTime}`) : null,
            attendedDuration, isPresent, source:"MEET_EXTENSION",
          }
        });
      }
      imported++;
    } catch (e:any) {
      // unique violation on null? skip
      skipped++;
    }
  }
  return res.json({ success:true, data:{ imported, skipped, total: participants.length }});
});

// POST /api/attendance/meet/:id/import-csv – Google CSV import
router.post("/meet/:id/import-csv", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (req: AuthRequest, res) => {
  const sessionId = String(req.params.id);
  const session = await prisma.attendanceSession.findUnique({ where:{id:sessionId}});
  if (!session) return res.status(404).json({ success:false, error:"Session not found"});
  const rows = (req.body.rows || req.body) as Array<Record<string,any>>;
  if (!Array.isArray(rows)) return res.status(400).json({ success:false, error:"rows array required (parse CSV client-side)"});
  let imported=0;
  for (const row of rows) {
    // row may have "Name" containing RegNo, "Email", "Duration"
    const rawName = String(row.Name || row.name || row["Participant Name"] || row["Display Name"] || "").trim();
    const email = String(row.Email || row.email || "").trim().toLowerCase() || null;
    if (!rawName && !email) continue;
    const { cleanName, registerNo } = parseMeetName(rawName);
    let userId: string | null = null;
    if (registerNo) {
      const u = await prisma.user.findUnique({ where:{registerNo}});
      if (u) userId = u.id;
    }
    if (!userId && email) {
      const u = await prisma.user.findFirst({ where:{ OR:[{email}, {vitEmail:email}]}});
      if (u) userId = u.id;
    }
    // duration parsing: "01:20:30" or seconds
    let attendedDuration: number | null = null;
    const durRaw = row.Duration || row.duration || row["Attended Duration"] || row["Time"];
    if (durRaw) {
      const s = String(durRaw).trim();
      if (s.includes(":")) {
        const parts = s.split(":").map(Number);
        if (parts.length===3) attendedDuration = parts[0]*3600 + parts[1]*60 + parts[2];
        else if (parts.length===2) attendedDuration = parts[0]*60 + parts[1];
      } else if (!isNaN(Number(s))) attendedDuration = Number(s);
    }
    const isPresent = attendedDuration ? attendedDuration > 1800 : true; // 30 min threshold or just present if row exists

    // upsert same as above
    const existing = registerNo ? await prisma.attendanceRecord.findFirst({ where:{ sessionId, registerNo }}) : (email ? await prisma.attendanceRecord.findFirst({ where:{ sessionId, email }}) : null);
    if (existing) {
      await prisma.attendanceRecord.update({
        where:{ id: existing.id },
        data:{ rawName: rawName||existing.rawName, cleanName, registerNo: registerNo||existing.registerNo, email: email||existing.email, attendedDuration: Math.max(existing.attendedDuration||0, attendedDuration||0), isPresent: isPresent||existing.isPresent, userId: userId||existing.userId, source:"MEET_CSV" }
      });
    } else {
      // need unique handling for null registerNo/email: create with random suffix? Use different unique fallback
      // If both null, generate a temp registerNo placeholder
      const regForCreate = registerNo || null;
      const emailForCreate = email || null;
      // Prisma unique will fail if we try duplicate nulls with same session? In SQLite/Postgres nulls distinct, so ok. But if we have many nulls, they are distinct? Actually unique [sessionId, registerNo] with null registerNo allows many rows because NULL != NULL. So okay.
      // However Prisma create with null may hit second unique [sessionId,email] with null email also multiple? Same logic allows.
      // To avoid unique violation when both null and rawName same, we need to allow duplicates: we will create with rawName unique via not using unique, but our schema has uniques. So we need to handle: if both null, skip unique check and create with no unique? Workaround: set email to rawName+random for uniqueness
      let finalEmail = emailForCreate;
      let finalReg = regForCreate;
      if (!finalEmail && !finalReg) {
        // use rawName as email placeholder hashed
        finalEmail = `unknown-${Buffer.from(rawName).toString('base64').slice(0,12).toLowerCase()}@unknown.local`;
      }
      await prisma.attendanceRecord.create({
        data:{ sessionId, userId, rawName: rawName||"Unknown", cleanName, registerNo: finalReg, email: finalEmail, attendedDuration, isPresent, source:"MEET_CSV" }
      });
    }
    imported++;
  }
  return res.json({ success:true, data:{ imported }});
});

// GET /api/attendance/sessions – list
router.get("/sessions", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit||"20")),1),100);
  const offset = Math.max(parseInt(String(req.query.offset||"0")),0);
  const type = req.query.type ? String(req.query.type) : undefined;
  const where:any={};
  if (type) where.type = type;
  // ADMIN sees all, MEMBER sees own created? For now all see all? restrict to ADMIN view
  // If MEMBER, only sessions where they are participant? For now allow all.
  const [sessions, total] = await Promise.all([
    prisma.attendanceSession.findMany({
      where, orderBy:{ date:"desc"}, take:limit, skip:offset,
      include:{ category:{ select:{ name:true, slug:true }}, createdBy:{ select:{ username:true, displayName:true }}, _count:{ select:{ records:true }}, inPersonEvent:{ select:{ slug:true }}}
    }),
    prisma.attendanceSession.count({ where })
  ]);
  // add counts for present
  const withCounts = await Promise.all(sessions.map(async s=>{
    const present = await prisma.attendanceRecord.count({ where:{ sessionId:s.id, isPresent:true }});
    const totalRec = await prisma.attendanceRecord.count({ where:{ sessionId:s.id }});
    return { ...s, presentCount: present, totalCount: totalRec };
  }));
  res.json({ success:true, data:{ sessions: withCounts, total, limit, offset }});
});

// GET /api/attendance/session/:id – detail
router.get("/session/:id", requireAuth, async (req,res)=>{
  const id = String(req.params.id);
  const session = await prisma.attendanceSession.findUnique({
    where:{id},
    include:{
      category:true,
      createdBy:{ select:{ username:true, displayName:true }},
      inPersonEvent: true,
      records:{ include:{ user:{ select:{ username:true, displayName:true, registerNo:true, email:true, school:true, programme:true }}}, orderBy:{ isPresent:"desc" }}
    }
  });
  if (!session) return res.status(404).json({ success:false, error:"Session not found"});
  const presentCount = session.records.filter(r=>r.isPresent).length;
  res.json({ success:true, data:{ session, presentCount, totalCount: session.records.length }});
});

// GET /api/attendance/session/:id/compare – present/absent/unknown vs FFCS master
router.get("/session/:id/compare", requireAuth, async (req,res)=>{
  const id = String(req.params.id);
  const session = await prisma.attendanceSession.findUnique({ where:{id}});
  if (!session) return res.status(404).json({ success:false, error:"Session not found"});
  const records = await prisma.attendanceRecord.findMany({ where:{ sessionId:id }, include:{ user:true }});
  const present = records.filter(r=>r.isPresent);
  const presentRegNos = new Set(present.map(r=>r.registerNo).filter(Boolean) as string[]);
  const presentEmails = new Set(present.map(r=>r.email?.toLowerCase()).filter(Boolean) as string[]);

  // absent = MemberProfile not in present
  const allMembers = await prisma.memberProfile.findMany({ include:{ user:true }});
  const absent = allMembers.filter(m=>{
    if (presentRegNos.has(m.registerNo)) return false;
    if (presentEmails.has(m.email.toLowerCase())) return false;
    // also check if member's user linked to any present record via userId
    if (m.userId && present.some(p=>p.userId===m.userId)) return false;
    return true;
  });

  const unknown = records.filter(r=>!r.userId && !presentRegNos.has(r.registerNo||"") && !r.registerNo);
  // unknown also includes those with registerNo but no MemberProfile? That's actually absent? But we show as unknown if registerNo not in member list but present
  const unknownWithRegNo = present.filter(r=>r.registerNo && !allMembers.some(m=>m.registerNo===r.registerNo));

  res.json({
    success:true,
    data:{
      present: present.map(r=>({ ...r, matched: !!r.userId })),
      absent: absent.map(m=>({ registerNo:m.registerNo, name:m.name, school:m.school, programme:m.programme, email:m.email, isToastmaster:m.isToastmaster, club:m.club, userId:m.userId })),
      unknown: [...unknown, ...unknownWithRegNo],
      counts:{ present:present.length, absent: absent.length, unknown: unknown.length + unknownWithRegNo.length, totalRecords: records.length, totalMembers: allMembers.length }
    }
  });
});

// POST /api/attendance/session/:id/close
router.post("/session/:id/close", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (req,res)=>{
  const id=String(req.params.id);
  const session=await prisma.attendanceSession.findUnique({ where:{id}});
  if (!session) return res.status(404).json({ success:false, error:"Not found"});
  const updated=await prisma.attendanceSession.update({ where:{id}, data:{ status:"CLOSED", endTime: new Date() }});
  if (session.type==="IN_PERSON" && session.id) {
    await prisma.inPersonEvent.updateMany({ where:{ sessionId: id }, data:{ endTime: new Date() }});
  }
  res.json({ success:true, data:updated});
});

// POST /api/attendance/in-person/:slug/register – public (optional auth)
router.post("/in-person/:slug/register", optionalAuth, async (req: AuthRequest, res)=>{
  const slug=String(req.params.slug);
  const event = await prisma.inPersonEvent.findUnique({ where:{slug}, include:{ session:true }});
  if (!event || !event.session) return res.status(404).json({ success:false, error:"Event not found"});
  if (event.session.status==="CLOSED" || event.endTime) return res.status(400).json({ success:false, error:"Event closed"});

  // need auth to register? allow but require login
  if (!req.user) return res.status(401).json({ success:false, error:"Login required" });
  const user = await prisma.user.findUnique({ where:{id: req.user.id}});
  if (!user) return res.status(404).json({ success:false, error:"User not found"});
  const email = user.email;

  const allowedDomains: string[] = event.allowedEmailDomains ? JSON.parse(event.allowedEmailDomains) : [];
  const allowedEmails: string[] = event.allowedEmails ? JSON.parse(event.allowedEmails) : [];
  if (!isEmailAllowed(email, allowedDomains, allowedEmails)) {
    return res.status(403).json({ success:false, error:"Email not allowed for this event"});
  }

  // check already registered
  const existingAttendee = await prisma.inPersonAttendee.findUnique({ where:{ userId_eventId:{ userId:user.id, eventId:event.id }}});
  if (existingAttendee) return res.json({ success:true, message:"Already registered", data: existingAttendee });

  const attendee = await prisma.inPersonAttendee.create({ data:{ eventId:event.id, userId:user.id, registrationTime:new Date() }});
  // also create AttendanceRecord
  const { cleanName, registerNo } = parseMeetName(user.displayName);
  await prisma.attendanceRecord.create({
    data:{
      sessionId: event.sessionId, userId:user.id, rawName:user.displayName, cleanName, registerNo: user.registerNo || registerNo, email: user.email,
      registrationTime:new Date(), isPresent:false, source:"QR_REGISTER"
    }
  }).catch(()=>{});

  return res.status(201).json({ success:true, data:attendee });
});

// POST /api/attendance/in-person/:slug/checkin – ADMIN scan
router.post("/in-person/:slug/checkin", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (req:AuthRequest,res)=>{
  const slug=String(req.params.slug);
  const event = await prisma.inPersonEvent.findUnique({ where:{slug}, include:{ session:true }});
  if (!event) return res.status(404).json({ success:false, error:"Event not found"});
  const { userId, checkInTime } = req.body;
  if (!userId) return res.status(400).json({ success:false, error:"userId required"});
  const targetUser = await prisma.user.findUnique({ where:{id:userId}});
  if (!targetUser) return res.status(404).json({ success:false, error:"User not found"});
  const attendee = await prisma.inPersonAttendee.findUnique({ where:{ userId_eventId:{ userId, eventId:event.id }}});
  if (!attendee) return res.status(404).json({ success:false, error:"User not registered for this event"});
  if (attendee.checkInTime) return res.status(400).json({ success:false, error:"Already checked in"});

  const check = checkInTime ? new Date(checkInTime) : new Date();
  const updated = await prisma.inPersonAttendee.update({ where:{ id: attendee.id }, data:{ checkInTime: check }});
  // update AttendanceRecord
  await prisma.attendanceRecord.updateMany({
    where:{ sessionId:event.sessionId, userId },
    data:{ checkInTime: check, isPresent:true, source:"QR_SCAN" }
  });
  // if no record exists, create one
  const recCount = await prisma.attendanceRecord.count({ where:{ sessionId:event.sessionId, userId }});
  if (recCount===0) {
    const { cleanName, registerNo } = parseMeetName(targetUser.displayName);
    await prisma.attendanceRecord.create({
      data:{
        sessionId:event.sessionId, userId, rawName: targetUser.displayName, cleanName, registerNo: targetUser.registerNo || registerNo, email: targetUser.email,
        checkInTime: check, registrationTime: attendee.registrationTime, isPresent:true, source:"QR_SCAN"
      }
    });
  }

  return res.json({ success:true, data:updated });
});

// GET /api/attendance/in-person/:slug – public fetch event + user's status
router.get("/in-person/:slug", optionalAuth, async (req:AuthRequest,res)=>{
  const slug=String(req.params.slug);
  const event = await prisma.inPersonEvent.findUnique({
    where:{slug},
    include:{
      session:{ include:{ category:true }},
      attendees:{ include:{ user:{ select:{ id:true, displayName:true, email:true, registerNo:true }}}}
    }
  });
  if (!event) return res.status(404).json({ success:false, error:"Event not found"});

  let myStatus: any = null;
  if (req.user) {
    const att = await prisma.inPersonAttendee.findUnique({ where:{ userId_eventId:{ userId:req.user.id, eventId:event.id }}});
    if (att) myStatus = { hasRegistered:true, hasCheckedIn: !!att.checkInTime, checkInTime: att.checkInTime, registrationTime: att.registrationTime, userId: req.user.id };
    else myStatus = { hasRegistered:false, hasCheckedIn:false };
  }

  const allowedDomains: string[] = event.allowedEmailDomains ? JSON.parse(event.allowedEmailDomains) : [];
  const allowedEmails: string[] = event.allowedEmails ? JSON.parse(event.allowedEmails) : [];

  // attach session counts
  const presentCount = await prisma.inPersonAttendee.count({ where:{ eventId:event.id, checkInTime:{ not:null }}});
  const totalCount = await prisma.inPersonAttendee.count({ where:{ eventId:event.id }});

  res.json({
    success:true,
    data:{
      event: {
        id:event.id, slug:event.slug, title:event.title, venue:event.venue, date:event.date, startTime:event.startTime, endTime:event.endTime,
        allowedEmailDomains: allowedDomains, allowedEmails, status: event.session.status,
        category: event.session.category, points:event.session.points,
        presentCount, totalCount,
      },
      myStatus,
      attendees: event.attendees.slice(0,100) // limit for privacy, full via session/:id
    }
  });
});

// GET /api/attendance/in-person – list in-person events (admin)
router.get("/in-person", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (_req,res)=>{
  const events = await prisma.inPersonEvent.findMany({
    orderBy:{ startTime:"desc"},
    include:{
      session:{ select:{ title:true, date:true, status:true, points:true, category:{ select:{ name:true } }}},
      _count:{ select:{ attendees:true }}
    }
  });
  const withCounts = await Promise.all(events.map(async e=>{
    const present = await prisma.inPersonAttendee.count({ where:{ eventId:e.id, checkInTime:{ not:null }}});
    return { ...e, present, total:e._count.attendees };
  }));
  res.json({ success:true, data: withCounts });
});

// POST /api/attendance/session/:id/award – bulk award points to present
router.post("/session/:id/award", requireAuth, requireRole("ADMIN","SUPER_ADMIN"), async (req:AuthRequest,res)=>{
  const id=String(req.params.id);
  const session = await prisma.attendanceSession.findUnique({ where:{id}, include:{ category:true }});
  if (!session) return res.status(404).json({ success:false, error:"Session not found"});
  const { categorySlug, categoryId, amount, reason, where, how } = req.body;
  let catId = categoryId || session.categoryId;
  if (!catId && categorySlug) {
    const cat = await prisma.category.findUnique({ where:{slug:categorySlug}});
    if (!cat) return res.status(404).json({ success:false, error:"Category not found"});
    catId = cat.id;
  }
  if (!catId) return res.status(400).json({ success:false, error:"Category required" });
  const amt = amount ? Number(amount) : (session.points || 10);
  if (isNaN(amt) || amt<1 || amt>1000) return res.status(400).json({ success:false, error:"Invalid amount" });

  const present = await prisma.attendanceRecord.findMany({ where:{ sessionId:id, isPresent:true, userId:{ not:null }}});
  if (!present.length) return res.status(400).json({ success:false, error:"No present attendees with linked users" });

  // prevent double award: check metadata.sessionId already exists
  // SQLite doesn't support Json path filter, so filter in JS (works for both SQLite/Postgres)
  const allPointsForSession = await prisma.point.findMany({ select:{ recipientId:true, metadata:true }});
  const existingAwards = allPointsForSession.filter(p=> (p.metadata as any)?.sessionId === id);
  const alreadyAwarded = new Set(existingAwards.map(p=>p.recipientId));
  const toAward = present.filter(p=>p.userId && !alreadyAwarded.has(p.userId!));

  let awarded=0;
  for (const rec of toAward) {
    if (!rec.userId) continue;
    await prisma.$transaction(async (tx)=>{
      await tx.point.create({
        data:{
          recipientId: rec.userId!,
          awardedById: req.user!.id,
          amount: amt,
          reason: reason || `Attended ${session.title}`,
          where: where || session.venue || session.meetLink || undefined,
          how: how || (session.type==="MEET" ? "Google Meet auto-track" : "QR scanned"),
          categoryId: catId!,
          metadata: { sessionId: id, sessionType: session.type, registerNo: rec.registerNo } as any,
        }
      });
      await tx.user.update({ where:{id: rec.userId!}, data:{ totalPoints:{ increment: amt }}});
    });
    awarded++;
  }

  res.json({ success:true, data:{ awarded, skipped: present.length - awarded, alreadyAwarded: alreadyAwarded.size, totalPresent: present.length }});
});

export default router;
