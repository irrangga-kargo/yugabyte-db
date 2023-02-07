---
title: Host-based authentication
headerTitle: Host-based authentication
linkTitle: Host-based authentication
description: Manage access control for localhost, remote hosts, and clients for YSQL.
image: /images/section_icons/secure/authentication.png
menu:
  v2.14:
    identifier: host-based-authentication
    parent: authentication
    weight: 733
type: docs
---

<ul class="nav nav-tabs-alt nav-tabs-yb">
  <li >
    <a href="../host-based-authentication/" class="nav-link active">
      <i class="icon-postgres" aria-hidden="true"></i>
      YSQL
    </a>
  </li>
</ul>

YugabyteDB host-based authentication for YSQL manages access control for localhost, remote hosts, and clients. Using host-based authentication, you can define rules for access to localhost and remote clients based on IP addresses, authentication methods, and use of TLS (aka SSL) certificates.

The default YugabyteDB `listen_addresses` setting only accepts connections from `localhost`. To allow remote connections, you must add client authentication records to the YB-TServer [--ysql_hba_conf_csv](../../../reference/configuration/yb-tserver/#ysql-hba-conf-csv) configuration flag. The flag works similarly to the `pg_hba.conf` file in PostgreSQL. The values include records that specify allowed connection types, users, client IP addresses, and authentication methods. These records are stored in the autogenerated YugabyteDB [ysql_hba.conf](#ysql-hba-conf-file) file.

When a connection request is received, YugabyteDB does the following:

1. Searches the `ysql_hba.conf` records serially until the first record with a matching connection type, client address, requested database, and `username` is found.
1. Authenticates based on the matching record.
1. If the information provided in the connection request matches the expected content, allows access. If authentication fails, then subsequent records are not evaluated and access is denied.

The `--ysql_hba_conf_csv` flag is read on start-up of your cluster. If you edit the file on an active cluster, you need to restart your `yb-tserver` processes for changes to take effect.

{{< note title="Important" >}}

Changes to `--ysql_hba_conf_csv` should be applied to all `yb-tserver` servers in a rolling upgrade and restart, making sure that all YB-TServers are not stopped at the same time.

{{< /note >}}

The system view `pg_hba_file_rules` can be helpful for pre-testing changes to the `--ysql_hba_conf_csv` flag, or for diagnosing problems if the flag did not have the desired effects. Rows in the view with non-null error fields indicate problems in the corresponding lines of the file.

{{< note title="Tip" >}}

To connect to a particular database, a user must not only pass the `--ysql_hba_conf_csv` checks, but must have the `CONNECT` privilege for the database. To restrict which users can connect to which databases, granting or revoking the `CONNECT` privilege is typically easier than putting the rules in `--ysql_hba_conf_csv` entries. Refer to the [`GRANT`](../../../api/ysql/the-sql-language/statements/dcl_grant/) and [`REVOKE`](../../../api/ysql/the-sql-language/statements/dcl_revoke/) YSQL statements.

{{< /note >}}

## ysql_hba.conf file

Records in the YugabyteDB `ysql_hba.conf` file are autogenerated based on the values included in the `--ysql_hba_conf_csv` flag. For example, starting a YB-TServer with the following `--ysql_hba_conf_csv` flag will enable MD5 authorization for all users except `yugabyte`, which can use trust when connecting from localhost:

```sh
--ysql_hba_conf_csv="host all yugabyte 127.0.0.1/0 trust, host all all 0.0.0.0/0 md5, host all yugabyte ::1/128 trust, host all all ::0/0 md5"
```

To display the values in the `ysql_hba.conf` file, run the following `SHOW` statement to get the file location:

```sql
yugabyte=# SHOW hba_file;
```

```output
                             hba_file
-------------------------------------------------------------------
 /Users/yugabyte/yugabyte-data/node-1/disk-1/pg_data/ysql_hba.conf
(1 row)
```

and then view the file. Because the file is autogenerated, edits are overwritten by the autogenerated content. Here is an example.

```output
# This is an autogenerated file, do not edit manually!
host all yugabyte 127.0.0.1/0 trust
host all yugabyte ::1/128 trust
/Users/yugabyte/yugabyte-data/node-1/disk-1/pg_data/ysql_hba.conf (END)
```

Because `ysql_hba.conf` records are examined sequentially for each connection attempt, the order of the records is significant. Typically, earlier records have tight connection match parameters and weaker authentication methods, while later records have looser match parameters and stronger authentication methods. For example, you might want to use trust authentication for local TCP/IP connections, but require a password for remote TCP/IP connections. In this case, a record specifying `trust` authentication for connections from `127.0.0.1` would appear before a record specifying password authentication for a wider range of allowed client IP addresses.

## Record fields

Each record specified in the `--ysql_hba_conf_csv` flag must match one of the following record formats available for local, CIDR addresses, or IP addresses:

```output
local      database  user  auth-method [auth-options]
host       database  user  address  auth-method  [auth-options]
hostssl    database  user  address  auth-method  [auth-options]
hostnossl  database  user  address  auth-method  [auth-options]
host       database  user  IP-address  netmask  auth-method  [auth-options]
hostssl    database  user  IP-address  netmask  auth-method  [auth-options]
hostnossl  database  user  IP-address  netmask  auth-method  [auth-options]
```

### local

This record matches connection attempts made via the UNIX socket.

### host

This record matches connection attempts made using TCP/IP, including localhost. `host` records match either SSL or non-SSL connection attempts.

### hostssl

This record specifies a local or remote host that can connect to a YugabyteDB cluster using SSL.

### hostnossl

This record only matches connection attempts made over TCP/IP that do not use SSL.

### database

Specifies which database names this record matches. Valid values include:

- `all`: matches all databases.
- `sameuser`: the record matches if the requested database has the same name as the requested user.
- `samerole`: the requested user must be a member of the role with the same name as the requested database. Superusers are not considered to be members of a role for the purposes of `samerole` unless they are explicitly members of the role, directly or indirectly, and not just by virtue of being a superuser.
- `replication`: the record matches if a physical replication connection is requested (note that replication connections do not specify any particular database). Otherwise, this is the name of a specific PostgreSQL database.

Multiple database names can be supplied by separating them with commas. A separate file containing database names can be specified by preceding the file name with `@`.

Files included by `@` constructs are read as lists of names, which can be separated by either whitespace or commas. Comments are introduced by `#`, just as in the `--ysql_hba_conf_csv` flag, and nested `@` constructs are allowed. Unless the file name following `@` is an absolute path, it is taken to be relative to the directory containing the referencing file.

### user

Specifies which database user names this record matches. Valid values include:

`all` matches all users. Otherwise, this is either the name of a specific database user, or a group name preceded by +. (Recall that there is no real distinction between users and groups in YugabyteDB; a `+` really means "match any of the roles that are directly or indirectly members of this role", while a name without a `+` matches only that specific role.) For this purpose, a superuser is only considered to be a member of a role if they are explicitly a member of the role, directly or indirectly, and not just by virtue of being a superuser.

Multiple user names can be supplied by separating them with commas.

A separate file containing user names can be specified by preceding the file name with `@`.

### address

Specifies the client machine addresses that this record matches. This field can contain either a host name, an IP address range, or one of the special key words mentioned below.

#### IP addresses

An IP address range is specified using standard numeric notation for the range's starting address, then a slash (/) and a CIDR mask length. The mask length indicates the number of high-order bits of the client IP address that must match. Bits to the right of this should be zero in the given IP address. There must not be any white space between the IP address, the `/`, and the CIDR mask length.

Examples of an IPv4 address range specified this way are `172.20.143.89/32` for a single host, or `172.20.143.0/24` for a small network, or `10.6.0.0/16` for a larger one. `0.0.0.0/0` represents all IPv4 addresses.

An IPv6 address range might look like `::1/128` for a single host (in this case, the IPv6 loopback address) or `fe80::7a31:c1ff:0000:0000/96` for a small network. `::0/0` represents all IPv6 addresses.

To specify a single host, use a mask length of 32 for IPv4 or 128 for IPv6. In a network address, do not omit trailing zeroes.

An entry given in IPv4 format will match only IPv4 connections, and an entry given in IPv6 format will match only IPv6 connections, even if the represented address is in the IPv4-in-IPv6 range. Entries in IPv6 format will be rejected if the system's C library does not support IPv6 addresses.

#### Key words

You can also use the following key words:

- `all` matches any IP address.
- `samehost` matches any of the server's own IP addresses.
- `samenet` matches any address in any subnet that the server is directly connected to.

#### Host names

If a host name is specified (anything that is not an IP address range or a special key word is treated as a host name), that name is compared with the result of a reverse name resolution of the client's IP address (for example, reverse DNS lookup, if DNS is used). Host name comparisons are case-insensitive. If there is a match, then a forward name resolution (for example, forward DNS lookup) is performed on the host name to check whether any of the addresses it resolves to are equal to the client's IP address. If both directions match, then the entry is considered to match. (The host name specified in the `--ysql_hba_conf_csv` flag should be the one that address-to-name resolution of the client's IP address returns, otherwise the line won't be matched. Some host name databases allow associating an IP address with multiple host names, but the operating system will only return one host name when asked to resolve an IP address.)

A host name specification that starts with a dot (`.`) matches a suffix of the actual host name. So `.example.com` would match `foo.example.com` (but not just `example.com`).

When host names are specified using the `--ysql_hba_conf_csv` flag, you want the name resolution to be reasonably fast. It can be advantageous to set up a local name resolution cache, such as `nscd`. Enable the configuration parameter `log_hostname` to see the client's host name instead of the IP address in the log.

This field only applies to `host`, `hostssl`, and `hostnossl` records.

### IP-address | netmask

These two fields can be used as an alternative to the **IP-address/mask-length** notation. Instead of specifying the mask length, the actual mask is specified in a separate column. For example, `255.0.0.0` represents an IPv4 CIDR mask length of `8`, and `255.255.255.255` represents a CIDR mask length of `32`.

Applies to `host`, `hostssl`, and `hostnossl` records.

When there is only one host, the netmask is `255.255.255.255`, representing a single IP address. For details, see [Netmask Quick Reference](http://www.unixwiz.net/techtips/netmask-ref.html).

### auth-method

Specifies the authentication method to use when a connection matches this record.

#### trust

Specify that any user from the defined host can connect to a YugabyteDB database without requiring a password. If the specified host is not secure or provides access to unknown users, this is a security risk. Even for local connections, `peer` should be used instead.

#### reject

Specify that the host or user should be rejected. Reject the connection unconditionally. Use this to filter out certain hosts from a group. For example, a reject line could block a specific host from connecting, while a later line allows the remaining hosts in a specific network to connect.

#### md5

Use `md5` password encryption. For more information, refer to [Password authentication](../password-authentication/).

#### scram-sha256

Use `scram-sha256` password encryption. For more information, refer to [Password authentication](../password-authentication/).

#### password

Specify that for a connecting user, the password supplied must match the password in the global `yb_show` system table for the username. The password must be sent in clear text.

#### ident

Obtain the operating system user name of the client by contacting the ident server on the client and check if it matches the requested database user name. Ident authentication can only be used on TCP/IP connections. When specified for local connections, peer authentication will be used instead.

#### peer

Obtain the client's operating system user name from the operating system and check if it matches the requested database user name. This is only available for local connections.

#### ldap

Use LDAP for password authentication. For more information, refer to [LDAP authentication](../ldap-authentication/).

#### cert

Specify that any user requires a TLS certificate to connect. For more information, refer to [Encryption in transit](../../tls-encryption/).

#### gss

Specify that any user requires GSSAPI authentication to connect.

### auth-options

After the [auth-method](#auth-method) field, you can add fields in the form `name=value` that specify options specific to the authentication method.

In addition to the method-specific options, there is one method-independent authentication option `clientcert`, which can be specified in any `hostssl` record. When set to 1, this option requires the client to present a valid (trusted) SSL certificate, in addition to the other requirements of the authentication method.

### Examples

#### Single host entry

The following record allows a single host with the IP address `192.168.1.10` to connect to any database (`all`) as any user (`all`) without a password (`trust`).

```sh
host all 192.168.1.10 255.255.255.255 trust
```

#### local entry

The following record allows local connections to any database as user `yugabyte` without a password (`trust`).

```sh
local all yugabyte trust
```

#### hostssl entry

The following record allows SSL connections to any database as any user from any address using `md5` password authentication.

```sh
hostssl all all all md5
```