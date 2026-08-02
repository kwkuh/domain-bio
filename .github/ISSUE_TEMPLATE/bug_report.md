---
name: Bug report
about: A name resolves wrong, or the server misbehaves
title: ''
labels: bug
---

<!-- For a security issue in the resolver, do NOT open a public issue: email
security@open-domain.com (see SECURITY.md). For misuse of a hostname (phishing,
malware), that is an abuse report: abuse@open-domain.com. -->

**The query**
The exact name and type, e.g. `dig +short 1.2.3.4.a-i.st A`.

**Expected**
What the answer should have been.

**Actual**
What you got. A full `dig` transcript is ideal:

```
$ dig 1.2.3.4.a-i.st A
...
```

**Which resolver**
Did you query the nameserver directly (`dig @<ip> ...`) or through a resolver
(1.1.1.1, your ISP)? Some resolvers block private IPs (DNS-rebinding protection) —
see the "if a name does not resolve" section on open-domain.com.
